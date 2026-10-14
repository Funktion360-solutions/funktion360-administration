import {test} from 'node:test';import assert from 'node:assert/strict';import {quoteStage} from '../src/lib/crm/quote-stage.ts';
const row={status:'draft',accepted_at:null,test_paid_at:null,expired:false};
test('draft approval and acceptance are distinct stages',()=>{assert.equal(quoteStage(row),'draft');assert.equal(quoteStage({...row,status:'approved'}),'approved');assert.equal(quoteStage({...row,status:'approved',accepted_at:'2026-10-14'}),'accepted');});
test('accepted offers retain their stage after the acceptance expiry date',()=>{assert.equal(quoteStage({...row,expired:true}),'expired');assert.equal(quoteStage({...row,expired:true,accepted_at:'2026-10-14'}),'accepted');assert.equal(quoteStage({...row,expired:true,accepted_at:'2026-10-14',test_paid_at:'2026-10-14'}),'test_paid');});
