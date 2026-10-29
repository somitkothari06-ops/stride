import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {RoleSource} from './types';
const processState=globalThis as typeof globalThis & {__strideCourseReferenceSecret?:Buffer};
const secret=processState.__strideCourseReferenceSecret??(processState.__strideCourseReferenceSecret=randomBytes(32)),ttl=15*60*1000;
export const ReferenceSchema=z.object({id:z.string().min(1).max(80),name:z.string().min(1).max(200),url:z.url().max(2000).refine(value=>new URL(value).protocol==='https:'),focus:z.string().min(20).max(1800),checkedAt:z.string().max(40)}).strict();
export const ReferenceSelection=z.object({reference:ReferenceSchema,proof:z.string().regex(/^[a-f0-9]{64}$/),expiresAt:z.number().int()}).strict();
export type CourseReference=z.infer<typeof ReferenceSchema>;
export type SealedReference=z.infer<typeof ReferenceSelection>;
export function courseSourceAllowed(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='mit.edu'||u.hostname.endsWith('.mit.edu'));}catch{return false;}}
function signature(session:string,subject:string,reference:CourseReference,expiresAt:number){return createHmac('sha256',secret).update(JSON.stringify({session,subject:subject.trim().toLowerCase(),reference,expiresAt})).digest('hex');}
export function sealReference(session:string,subject:string,source:RoleSource,index:number,now=Date.now()):SealedReference|null{
 if(!courseSourceAllowed(source.url)||source.excerpt.trim().length<20)return null;
 const parsed=ReferenceSchema.safeParse({id:`found-${index}`,name:source.title.trim()||new URL(source.url).hostname,url:source.url,focus:source.excerpt.trim(),checkedAt:source.retrievedAt});
 if(!parsed.success)return null;const reference=parsed.data;
 const expiresAt=now+ttl;return {reference,expiresAt,proof:signature(session,subject,reference,expiresAt)};
}
export function checkReference(session:string,subject:string,input:SealedReference,now=Date.now()){
 const parsed=ReferenceSelection.parse(input);
 if(parsed.expiresAt<now||parsed.expiresAt>now+ttl||!courseSourceAllowed(parsed.reference.url)||!timingSafeEqual(Buffer.from(parsed.proof,'hex'),Buffer.from(signature(session,subject,parsed.reference,parsed.expiresAt),'hex')))throw Error('COURSE_REFERENCE_EXPIRED');
 return parsed.reference;
}
