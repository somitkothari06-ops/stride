import{createHash}from'node:crypto';import{isIP}from'node:net';
const buckets=new Map<string,{start:number;expires:number;count:number}>();
// The deployment proxy must replace untrusted forwarding headers. No raw IP is stored.
export function clientBucket(request:Request){const ip=(request.headers.get('x-forwarded-for')||'').split(',').at(-1)?.trim();return createHash('sha256').update(ip&&isIP(ip)?ip:'unknown-client').digest('hex');}
export function limitBucket(key:string,limit:number,windowMs:number,now=Date.now()){for(const[k,v]of buckets)if(now>=v.expires)buckets.delete(k);const b=buckets.get(key)||{start:now,expires:now+windowMs,count:0};if(b.count>=limit)throw Error('CLIENT_RATE_LIMIT');b.count++;buckets.set(key,b);}
export function allowGuest(request:Request,now=Date.now()){limitBucket('guest-global',1000,3600000,now);limitBucket('guest-'+clientBucket(request),120,3600000,now);}
