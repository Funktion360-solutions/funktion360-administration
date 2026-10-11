import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function compiled(path) {
  return ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
}
const template = {};
vm.runInNewContext(compiled("../src/lib/support/email-template.ts"), {
  exports: template,
});
function actions({ missingHtml = false, retry = false } = {}) {
  const exports = {},
    events = [];
  let prepared, sent;
  const db = {
    rpc: async (name, args) => {
      events.push(name + ":" + (args.operation || ""));
      if (name === "get_crm_support_case")
        return { data: [{ case_number: "SUP-001002" }], error: null };
      if (args.operation === "prepare") {
        prepared = args.payload;
        return {
          data: {
            ...prepared,
            support_case_id: prepared.case_id,
            status: "prepared",
            html_body: missingHtml ? null : prepared.html_body,
          },
          error: null,
        };
      }
      if (args.operation === "retry")
        return {
          data: {
            id: args.payload.id,
            support_case_id: args.payload.case_id,
            status: "uncertain",
            html_body: null,
            body: "Original",
          },
          error: null,
        };
      return { data: {}, error: null };
    },
  };
  const mocks = {
    "next/navigation": {
      redirect: (path) => {
        throw Object.assign(Error("redirect"), { path });
      },
    },
    "next/cache": { revalidatePath: () => {} },
    "@/lib/auth/require-permission": { requirePermission: async () => {} },
    "@/lib/auth/require-staff-mfa": { requireStaffMfa: async () => {} },
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/support/email-template": template,
    "@/lib/support/resend": {
      mailConfigured: () => true,
      sendSupportEmail: async (email) => {
        sent = email;
        return "mock";
      },
    },
  };
  vm.runInNewContext(compiled("../src/app/actions/support.ts"), {
    exports,
    process: {
      env: {
        SUPPORT_MAIL_FROM: "support@example.invalid",
        SUPPORT_MAIL_REPLY_TO: "support@example.invalid",
      },
    },
    require: (id) => {
      if (!(id in mocks)) throw Error(id);
      return mocks[id];
    },
  });
  const form = new FormData();
  form.set("case_id", "11111111-1111-4111-8111-111111111111");
  form.set("request_id", "22222222-2222-4222-8222-222222222222");
  form.set("recipient", "customer@example.invalid");
  form.set("subject", "Et emne uden sagsnummer");
  form.set("body", "Hej Aksel");
  if (retry) form.set("retry", "yes");
  return {
    run: () => exports.sendMail(form),
    prepared: () => prepared,
    sent: () => sent,
    events,
  };
}
test("new mail carries actual case reference and HTML through the action into the provider", async () => {
  const a = actions();
  await assert.rejects(a.run(), (e) => e.path.endsWith("?notice=accepted"));
  assert.ok(a.prepared().html_body.includes("SUP-001002"));
  assert.ok(a.prepared().html_body.includes("Support-ID:"));
  assert.equal(a.sent().html_body, a.prepared().html_body);
});
test("new mail without stored HTML fails closed instead of silently sending plain text", async () => {
  const a = actions({ missingHtml: true });
  await assert.rejects(a.run(), (e) =>
    e.path.endsWith("?notice=template-error"),
  );
  assert.equal(a.sent(), undefined);
});
test("legacy retry preserves its original payload and does not regenerate a template", async () => {
  const a = actions({ retry: true });
  await assert.rejects(a.run(), (e) => e.path.endsWith("?notice=accepted"));
  assert.equal(a.sent().html_body, null);
  assert.equal(a.sent().body, "Original");
  assert.ok(!a.events.includes("get_crm_support_case:"));
});
