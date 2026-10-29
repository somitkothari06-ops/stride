import {NextResponse} from 'next/server';
import {z} from 'zod';
import {body,checkOrigin,failure,requireSession} from '@/lib/http';
import {searchWeb} from '@/lib/ai';
import {sealReference} from '@/lib/course-references';
export const runtime='nodejs';
export async function POST(request:Request){try{
 checkOrigin(request);const {id}=await requireSession();
 const {subject}=z.object({subject:z.string().trim().min(2).max(80)}).strict().parse(await body(request,2000));
 const normalized=subject.toLowerCase();
 const starter=/algorithm|data structure|\bdsa\b|\bdaa\b/.test(normalized)?'mit-algorithms':/operating|\bos\b/.test(normalized)?'mit-os':/database|dbms|\bsql\b/.test(normalized)?'mit-database':null;
 if(starter)return NextResponse.json({subject,references:[],curatedId:starter},{headers:{'Cache-Control':'no-store'}});
 const sources=await searchWeb(id,`${subject} MIT OpenCourseWare course lectures site:ocw.mit.edu`,{timeoutMs:8000});
 const references=sources.flatMap((source,index)=>{const sealed=sealReference(id,subject,source,index);return sealed?[sealed]:[];});
 return NextResponse.json({subject,references},{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}}
