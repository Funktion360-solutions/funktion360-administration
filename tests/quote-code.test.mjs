import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acceptanceHash,offerHash} from '../src/lib/crm/quote-code.ts';
const id='df24e792-6d45-4d4b-8d59-96935e49fef8',key='a'.repeat(64);
test('code hashes are bound to the challenge and deployment key',()=>{assert.notEqual(acceptanceHash(id,'123456',key),acceptanceHash(id,'123456','b'.repeat(64)));assert.notEqual(acceptanceHash(id,'123456',key),acceptanceHash('bf24e792-6d45-4d4b-8d59-96935e49fef8','123456',key));});
test('invalid tokens, codes and weak keys fail closed',()=>{assert.throws(()=>offerHash('bad'));assert.throws(()=>acceptanceHash(id,'12345',key));assert.throws(()=>acceptanceHash(id,'123456','weak'));});
