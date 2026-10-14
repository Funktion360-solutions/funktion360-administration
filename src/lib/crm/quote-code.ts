import {createHmac,createHash} from 'node:crypto';
export function offerHash(token:string){if(!/^[0-9a-f]{64}$/.test(token))throw new Error('Invalid offer token');return createHash('sha256').update(token).digest('hex');}
export function acceptanceHash(challenge:string,code:string,secret:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challenge) || !/^[0-9]{6}$/.test(code) || !/^[0-9a-f]{64}$/i.test(secret))throw new Error('Invalid challenge');return createHmac('sha256',Buffer.from(secret,'hex')).update(challenge.toLowerCase()+':'+code).digest('hex');}
