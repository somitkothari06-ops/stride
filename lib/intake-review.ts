import {guidedIntake} from './planner';import type {Intake} from './types';
export async function intakeReview(source:string,infer:()=>Promise<Intake>):Promise<{candidate:Intake;mode:'live'|'guided'}>{
 try{return{candidate:await infer(),mode:'live'};}catch(error){
  if(!(error instanceof Error)||!['MODEL_UNAVAILABLE','DAILY_LIMIT'].includes(error.message))throw error;
  return{candidate:{...guidedIntake(source),uncertainty:'Check the title, subject and due date before saving.'},mode:'guided'};
 }
}
