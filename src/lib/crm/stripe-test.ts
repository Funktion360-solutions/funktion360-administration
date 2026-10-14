import 'server-only';
import Stripe from 'stripe';
export function stripeTest(){
 const key=process.env.STRIPE_SECRET_KEY;
 if(process.env.F360_STRIPE_TEST_CHECKOUT!=='true' || !key || !/^(sk|rk)_test_/.test(key) || !process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))throw new Error('Stripe test configuration missing');
 return new Stripe(key);
}
