import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestNextStep} from '../src/lib/crm/product-request-stage.ts';
test('Favn360 requires checking commercial prerequisites',()=>assert.match(requestNextStep('favn360','pending'),/betaling/));
test('failure and provisioning take priority over product-specific steps',()=>{assert.match(requestNextStep('favn360','failed'),/fejlen/);assert.match(requestNextStep('vores-kok','provisioning'),/bekræftelse/);});
