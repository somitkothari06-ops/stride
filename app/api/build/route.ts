import { NextResponse } from 'next/server';
import {body,checkOrigin,failure,requireSession} from '@/lib/http';
import {getState,mutate} from '@/lib/store';
import {model} from '@/lib/ai';
import {BuildInput,buildPlanContract,buildFeedbackContract,assertBuildInput,applyBuild,buildReplay,buildSnapshot,buildSources,buildContextKey,buildPlanTask,buildReviewTask,projectPrompt} from '@/lib/student-build';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const pending=new Map<string,Promise<void>>();
export async function GET(){try{const {state}=await requireSession();return NextResponse.json(buildSnapshot(state),{headers});}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 checkOrigin(request);const {id,state}=await requireSession();const input=BuildInput.parse(await body(request,12000));
 if(buildReplay(state,input))return NextResponse.json(buildSnapshot(state),{headers});
 assertBuildInput(state,input);
 const key=id+':'+input.requestId;
 let job=pending.get(key);
 if(!job){
  job=(async()=>{
   const fresh=getState(id)!;if(buildReplay(fresh,input))return;assertBuildInput(fresh,input);
   if(input.action==='create'){
    const sources=buildSources(fresh,input.idea+' '+input.subject);
    const result=await model(id,buildPlanTask,{idea:input.idea,subject:input.subject,minutes:input.minutes,goal:fresh.profile.goal,savedContext:sources},buildPlanContract(input.minutes),{maxTokens:2200,timeoutMs:25000});
    mutate(id,current=>{if(!buildReplay(current,input)&&buildContextKey(buildSources(current,input.idea+' '+input.subject))!==buildContextKey(sources))throw new Error('BUILD_STALE');applyBuild(current,input,result,sources);});
   }else if(input.action==='submit'){
    const project=fresh.build!.project!,query=project.idea+' '+project.current.title+' '+input.text;
    const sources=buildSources(fresh,query,input.evidenceId),signature=buildContextKey(sources);
    const result=await model(id,buildReviewTask,{project:projectPrompt(project),submission:input.text,availableMinutes:project.current.minutes,sources},buildFeedbackContract(project.current.minutes,sources.map(source=>source.id)),{maxTokens:1800,timeoutMs:25000});
    mutate(id,current=>{if(!buildReplay(current,input)&&buildContextKey(buildSources(current,query,input.evidenceId))!==signature)throw new Error('BUILD_STALE');applyBuild(current,input,result,sources);});
   }else mutate(id,current=>applyBuild(current,input));
  })().finally(()=>pending.delete(key));pending.set(key,job);
 }
 await job;const final=getState(id)!;if(!buildReplay(final,input))throw new Error('BUILD_STALE');return NextResponse.json(buildSnapshot(final),{headers});
 }catch(error){return failure(error);}}
