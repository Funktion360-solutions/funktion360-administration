import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import fs from "node:fs";
import vm from "node:vm";
function load(path, dependencies = {}) {
  const exports = {};
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(js, {
    exports,
    require: (id) => {
      if (id === "server-only") return {};
      if (id in dependencies) return dependencies[id];
      throw Error("Unexpected import " + id);
    },
    Response,
    URL,
    AbortSignal,
    Uint8Array,
    fetch: () => {
      throw Error("Network forbidden");
    },
  });
  return exports;
}
const files = load("../src/lib/support/attachments.ts");
const mail = "11111111-1111-4111-8111-111111111111";
const local = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
const attachment = {
  id,
  filename: "faktura.pdf",
  size: 3,
  content_type: "application/pdf",
  download_url: `https://inbound-cdn.resend.com/${mail}/attachments/${id}?signature=secret`,
};
const meta = (value) => new Response(JSON.stringify(value));
test("metadata stays scoped to email, strips signed URLs, and paginates", async () => {
  let calls = 0;
  const list = await files.listAttachments(
    mail,
    "mock",
    async (url, options) => {
      assert.equal(options.headers.Authorization, "Bearer mock");
      assert.equal(options.redirect, "error");
      calls++;
      assert.equal(
        url,
        `https://api.resend.com/emails/receiving/${mail}/attachments?limit=100${calls === 2 ? "&after=" + id : ""}`,
      );
      return meta({ data: [attachment], has_more: calls === 1 });
    },
  );
  assert.equal(calls, 2);
  assert.equal(list[0].download_url, undefined);
  assert.equal(list[0].filename, "faktura.pdf");
  await assert.rejects(
    files.listAttachments("https://attacker.invalid", "mock"),
  );
  await assert.rejects(
    files.listAttachments(mail, "mock", async () =>
      meta({ data: [{ ...attachment, size: -1 }], has_more: false }),
    ),
  );
});
test("downloads forced attachment with private cache, safe filename and no forwarded credentials", async () => {
  let calls = 0;
  const response = await files.downloadAttachment(
    mail,
    id,
    "mock",
    async (url, options) => {
      calls++;
      if (calls === 1) {
        assert.equal(
          url,
          `https://api.resend.com/emails/receiving/${mail}/attachments/${id}`,
        );
        return meta({ ...attachment, filename: "../Køkken\r\n.pdf" });
      }
      assert.equal(options.headers, undefined);
      assert.equal(options.redirect, "error");
      return new Response(new Uint8Array([1, 2, 3]));
    },
  );
  assert.equal(
    response.headers.get("content-type"),
    "application/octet-stream",
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(
    response.headers.get("content-disposition"),
    "attachment; filename=\"vedhaeftning\"; filename*=UTF-8''K%C3%B8kken.pdf",
  );
  assert.deepEqual(
    [...new Uint8Array(await response.arrayBuffer())],
    [1, 2, 3],
  );
});
test("rejects wrong attachment identity, foreign hosts, credentials, HTTP and wrong email paths", async () => {
  const urls = [
    "http://inbound-cdn.resend.com/" + mail + "/attachments/" + id,
    "https://evil.invalid/file",
    "https://inbound-cdn.resend.com.evil.invalid/file",
    `https://a:b@inbound-cdn.resend.com/${mail}/attachments/${id}`,
    `https://inbound-cdn.resend.com/${local}/attachments/${id}`,
  ];
  for (const download_url of urls) {
    let calls = 0;
    await assert.rejects(
      files.downloadAttachment(mail, id, "mock", async () => {
        calls++;
        return meta({ ...attachment, download_url });
      }),
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(
    files.downloadAttachment(mail, id, "mock", async () =>
      meta({ ...attachment, id: local }),
    ),
  );
});
test("rejects oversized metadata, oversized actual bytes and truncated downloads", async () => {
  let calls = 0;
  await assert.rejects(
    files.downloadAttachment(mail, id, "mock", async () => {
      calls++;
      return meta({ ...attachment, size: files.MAX_ATTACHMENT_BYTES + 1 });
    }),
    (error) => error.status === 413,
  );
  assert.equal(calls, 1);
  for (const length of [2, files.MAX_ATTACHMENT_BYTES + 1]) {
    let count = 0;
    await assert.rejects(
      files.downloadAttachment(mail, id, "mock", async () =>
        ++count === 1 ? meta(attachment) : new Response(new Uint8Array(length)),
      ),
    );
  }
});
test("permission, MFA and local inbox lookup precede any provider access", async () => {
  const events = [];
  let deny = false,
    mfa = false,
    lookup = { data: { id: local, provider_id: mail }, error: null };
  const access = load("../src/lib/support/attachment-access.ts", {
    "@/lib/auth/require-permission": {
      requirePermission: async (permission) => {
        events.push(permission);
        if (deny) throw Error("permission");
      },
    },
    "@/lib/auth/require-staff-mfa": {
      requireStaffMfa: async () => {
        events.push("mfa");
        if (mfa) throw Error("mfa");
      },
    },
    "@/lib/supabase/server": {
      createClient: async () => ({
        rpc: async (name, args) => {
          events.push("lookup");
          assert.equal(name, "crm_support_inbox");
          assert.equal(args.payload.id, local);
          return lookup;
        },
      }),
    },
    "./attachments": files,
  });
  assert.equal(await access.authorizedMailProviderId(local), mail);
  assert.deepEqual(events, ["support.read", "mfa", "lookup"]);
  events.length = 0;
  deny = true;
  await assert.rejects(access.authorizedMailProviderId(local));
  assert.deepEqual(events, ["support.read"]);
  deny = false;
  mfa = true;
  events.length = 0;
  await assert.rejects(access.authorizedMailProviderId(local));
  assert.deepEqual(events, ["support.read", "mfa"]);
  mfa = false;
  lookup = { data: null, error: null };
  await assert.rejects(
    access.authorizedMailProviderId(local),
    (e) => e.status === 404,
  );
  lookup = { data: { id: mail, provider_id: mail }, error: null };
  await assert.rejects(
    access.authorizedMailProviderId(local),
    (e) => e.status === 404,
  );
  lookup = { data: null, error: { message: "denied" } };
  await assert.rejects(
    access.authorizedMailProviderId(local),
    (e) => e.status === 403,
  );
});
