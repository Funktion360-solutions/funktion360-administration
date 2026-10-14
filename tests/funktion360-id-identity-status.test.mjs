import {test} from 'node:test';
import assert from 'node:assert/strict';
import {identityStatus} from '../src/lib/funktion360-id/identity-status.ts';
const identity={system:'funktion360_id',external_user_id:'df24e792-6d45-4d4b-8d59-96935e49fef8',is_active:true};
test('other product identities and matching emails cannot establish an ID mapping',()=>assert.equal(identityStatus([{...identity,system:'favn360'}]).status,'missing'));
test('inactive, invalid and duplicate mappings remain distinct',()=>{assert.equal(identityStatus([{...identity,is_active:false}]).status,'inactive');assert.equal(identityStatus([{...identity,external_user_id:'bad'}]).status,'invalid');assert.equal(identityStatus([identity,identity]).status,'conflict');});
test('a single valid CRM mapping is registered, not claimed as verified membership',()=>assert.equal(identityStatus([identity]).status,'registered'));
