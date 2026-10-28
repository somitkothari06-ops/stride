import type { Direction } from "./types";
export function roleSearchQuery(value:string){
 const query=value.trim().replace(/\s+/g," ");
 // Keep questions and explicit locations intact. A bare field gets only role context.
 return /[?？]|\b(how|what|where|why|which|internships?|jobs?|careers?|roles?|india|remote|bengaluru|bangalore)\b/i.test(query)
  ? query : `${query} careers skills entry level`;
}
export function reusableDirection(direction:Direction|null,role:string,now=Date.now()){
 const stamp=direction?Date.parse(direction.updatedAt):NaN;
 return Boolean(direction?.searchId && direction.role.trim().toLocaleLowerCase()===role.trim().toLocaleLowerCase() && Number.isFinite(stamp) && now-stamp>=0 && now-stamp<15*60*1000);
}
