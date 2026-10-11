import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {Webhook} from 'svix';
const require=createRequire(import.meta.url),exports={};
const source=fs.readFileSync(new URL('../src/lib/support/inbound.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(compiled,{exports,require,Headers,AbortSignal,fetch:()=>{throw Error('Network forbidden');}});
const secret='whsec_'+randomBytes(32).toString('base64');
const body=JSON.stringify({type:'email.received',created_at:new Date().toISOString(),data:{email_id:'11111111-1111-4111-8111-111111111111'}});
function headers(date=new Date()){
 return new Headers({'svix-id':'test-event','svix-timestamp':String(Math.floor(date.getTime()/1000)),'svix-signature':new Webhook(secret).sign('test-event',date,body)});
}
test('verifies signature and rejects changed body, wrong secret and stale replay',()=>{
 assert.equal(exports.verifyEvent(body,headers(),secret).type,'email.received');
 assert.throws(()=>exports.verifyEvent(body+' ',headers(),secret));
 assert.throws(()=>exports.verifyEvent(body,headers(),'whsec_'+randomBytes(32).toString('base64')));
 assert.throws(()=>exports.verifyEvent(body,headers(new Date(Date.now()-600000)),secret));
 assert.throws(()=>exports.verifyEvent(body,new Headers(),secret));
});
test('extracts mailboxes and keeps email display as plain text',()=>{
 assert.equal(exports.mailbox('Customer <Customer@Example.com>'),'customer@example.com');
 assert.throws(()=>exports.mailbox('invalid'));assert.throws(()=>exports.mailbox('a@example.com,b@example.com'));
 assert.equal(exports.plainMail(null,'<style>secret</style><p>Hello &amp; thanks</p><script>alert(1)</script>'),'Hello & thanks');
 assert.equal(exports.plainMail('plain text','<p>other</p>'),'plain text');
 assert.equal(exports.plainMail(null,null),'[Mail uden tekstindhold]');
});
test('fetches only the fixed Resend endpoint and validates identity',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 const mail=await exports.retrieveMail(id,'mock',async(url)=>{assert.equal(url,`https://api.resend.com/emails/receiving/${id}?html_format=cid`);return {ok:true,json:async()=>({id,from:'a@example.com',to:['support@indbakke.funktion360.dk']})};});
 assert.equal(mail.id,id);
 await assert.rejects(exports.retrieveMail('https://example.com','mock'));
 await assert.rejects(exports.retrieveMail(id,'mock',async()=>({ok:false})));
 await assert.rejects(exports.retrieveMail(id,'mock',async()=>({ok:true,json:async()=>({id:'wrong'})})));
});
