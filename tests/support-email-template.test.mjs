import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import fs from "node:fs";
import vm from "node:vm";
const source = fs.readFileSync(
  new URL("../src/lib/support/email-template.ts", import.meta.url),
  "utf8",
);
const exports = {};
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  { exports },
);
test("mail template preserves paragraphs and escapes untrusted markup", () => {
  const html = exports.renderSupportEmail(
    "<img onerror=alert(1)>",
    "Hej Aksel\r\nTak & velkommen.\r\n\r\n<script>bad()</script>",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img "));
  assert.ok(html.includes("Hej Aksel<br>Tak &amp; velkommen."));
  assert.ok(html.includes("&lt;script&gt;bad()&lt;/script&gt;"));
  assert.ok(html.includes("Venlig hilsen"));
  assert.ok(html.includes('role="presentation"'));
  assert.equal(
    exports.renderSupportEmail("Emne", "Tekst"),
    exports.renderSupportEmail("Emne", "Tekst"),
  );
});
