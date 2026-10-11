import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';
// Execute the real provider adapter with an injected fetch; no network and no mail.
const source=fs.readFileSync(new URL('../src/lib/support/resend.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
const env={RESEND_API_KEY:'mock',SUPPORT_MAIL_FROM:'support@example.invalid',SUPPORT_MAIL_REPLY_TO:'support@example.invalid'};
vm.runInNewContext(compiled,{exports,require:(id)=>{assert.equal(id,'server-only');return {};},process:{env},AbortSignal,fetch:()=>{throw Error('Network forbidden');}});
const email={id:'test-request',sender:'support@example.invalid',recipient:'customer@example.invalid',reply_to:'support@example.invalid',subject:'Test',body:'Plain text'};
test('uses fixed Resend URL, immutable payload and idempotency key',async()=>{
 let calls=0;
 const request=async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],'support/test-request');assert.deepEqual(JSON.parse(options.body),{from:email.sender,to:[email.recipient],reply_to:email.reply_to,subject:email.subject,text:email.body});return {ok:true,json:async()=>({id:'provider-id'})};};
 assert.equal(await exports.sendSupportEmail(email,request),'provider-id');
 assert.equal(await exports.sendSupportEmail(email,request),'provider-id');
 assert.equal(calls,2);
});
test('rejects provider error, malformed reply and timeout',async()=>{
 await assert.rejects(exports.sendSupportEmail(email,async()=>({ok:false}))); 
 await assert.rejects(exports.sendSupportEmail(email,async()=>({ok:true,json:async()=>({})})));
 await assert.rejects(exports.sendSupportEmail(email,async()=>{throw Error('timeout');}));
});
test('missing credentials block outgoing request',async()=>{
 delete env.RESEND_API_KEY;
 let called=false;
 await assert.rejects(exports.sendSupportEmail(email,async()=>{called=true;}));
 assert.equal(called,false);
});
