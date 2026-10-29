import {NextResponse} from 'next/server';
import {checkOrigin,failure,body} from '@/lib/http';
import {allowGuest} from '@/lib/client-limits';
import {createSession,mutate} from '@/lib/store';
import {demoWorkspace} from '@/lib/demo-workspace';
export const runtime='nodejs';
export async function POST(request:Request){try{checkOrigin(request);await body(request,1000);allowGuest(request);const session=createSession(false);mutate(session.id,state=>Object.assign(state,demoWorkspace()));const response=NextResponse.json({destination:'/workspace'},{headers:{'Cache-Control':'no-store'}});const options={httpOnly:true,sameSite:'lax' as const,secure:new URL(request.url).protocol==='https:',path:'/',maxAge:86400*7};response.cookies.set('stride_demo_session',session.token,options);response.cookies.set('stride_demo_mode','1',options);return response;}catch(error){return failure(error);}}
export async function DELETE(request:Request){try{checkOrigin(request);const response=NextResponse.json({left:true},{headers:{'Cache-Control':'no-store'}});response.cookies.set('stride_demo_session','',{path:'/',maxAge:0,httpOnly:true});response.cookies.set('stride_demo_mode','',{path:'/',maxAge:0,httpOnly:true});return response;}catch(error){return failure(error);}}
