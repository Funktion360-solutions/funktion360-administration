import {test} from 'node:test';
import assert from 'node:assert/strict';
import {priceMinor,quoteLines,quoteTotals} from '../src/lib/crm/quote-lines.ts';
test('prices use exact minor units and accept Danish decimal separators',()=>{assert.equal(priceMinor('200,05'),20005);assert.equal(priceMinor('0.1'),10);for(const value of ['1e3','-1','1,234','NaN'])assert.equal(priceMinor(value),undefined);});
test('recurring and one-time amounts are never merged',()=>{const lines=quoteLines([{description:'Abonnement',quantity:2,unit_minor:20000,interval:'month'},{description:'Opsætning',quantity:1,unit_minor:50000,interval:'one_time'}]);assert.deepEqual(quoteTotals(lines),{month:40000,one_time:50000});});
test('invalid quantity and excessive line counts are rejected',()=>{assert.equal(quoteLines([{description:'x',quantity:1.5,unit_minor:10,interval:'month'}]),undefined);assert.equal(quoteLines(Array(51).fill({})),undefined);});
