import type{RoleSource}from'./types';
// Queries are selected from public topic labels: student names, messages and
// private course text are never copied into these fast-path web queries.
const topics:[RegExp,string][]=[[/\b(sql|joins?|dbms|database)\b/i,'SQL relational database official documentation'],[/\b(queue|stack|heap|tree|graph|algorithms?|data structures?|\bdsa\b)\b/i,'data structures algorithms MIT OpenCourseWare'],[/\b(operating systems?|round.robin|deadlock|paging|scheduling)\b/i,'operating systems scheduling MIT xv6 teaching'],[/\b(python)\b/i,'Python official documentation tutorial'],[/\b(node\.?js|express\.?js|backend)\b/i,'Node.js Express official documentation tutorial'],[/\b(javascript)\b/i,'JavaScript MDN official documentation'],[/\b(cybersecurity|security logs?|failed logins?)\b/i,'cybersecurity beginner synthetic log analysis learning'],[/\b(tcp|udp|computer networks?|routing)\b/i,'computer networking MIT OpenCourseWare'],[/\b(machine learning|neural networks?|deep learning)\b/i,'machine learning MIT OpenCourseWare fundamentals']];
export function fastPublicQuery(text:string){if(/\b(latest|current|news|today|price|salary|jobs?|internships?|202[6-9])\b/i.test(text))return null;const topic=topics.find(([pattern])=>pattern.test(text))?.[1];if(!topic)return null;const detail=['join','left join','inner join','window functions','group by','indexes','transactions','normalization','queue','stack','heap','tree','graph','recursion','deadlock','paging','round robin','scheduling','closures','promises','async','loops','lists','dictionaries'].filter(word=>new RegExp('\\b'+word+'s?\\b','i').test(text)).slice(0,3);return [topic,...detail].join(' ');}
type Entry={until:number;result?:RoleSource[];pending?:Promise<RoleSource[]>};
const cache=new Map<string,Entry>();const ttl=5*60*1000,maxEntries=128;
export async function cachedPipSearch(owner:string,query:string,load:()=>Promise<RoleSource[]>,now=Date.now()):Promise<RoleSource[]>{
 const key=JSON.stringify([owner,query.trim().toLowerCase()]);const old=cache.get(key);
 if(old&&old.until>now){if(old.result)return structuredClone(old.result);if(old.pending)return structuredClone(await old.pending);}
 for(const[k,v]of cache)if(v.until<=now)cache.delete(k);
 if(cache.size>=maxEntries)cache.delete(cache.keys().next().value!);
 const entry:Entry={until:now+(/\b(latest|current|today|news|jobs?|internships?)\b/i.test(query)?60000:ttl)};
 const pending=load();entry.pending=pending;cache.set(key,entry);
 try{const result=await pending;if(cache.get(key)===entry){entry.result=structuredClone(result);entry.pending=undefined;}return structuredClone(result);}catch(error){if(cache.get(key)===entry)cache.delete(key);throw error;}
}
