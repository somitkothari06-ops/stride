import {NextResponse} from 'next/server';
import {body,checkOrigin,failure} from '@/lib/http';
import {clientBucket,limitBucket} from '@/lib/client-limits';
import {model} from '@/lib/ai';
import {LandingLabInput,LandingLabFeedback,landingLabTask} from '@/lib/landing-lab';
export const runtime='nodejs';
export const maxDuration=30;
export async function POST(request:Request){
 try{
  if(!request.headers.get('origin'))throw Error('FORBIDDEN');
  checkOrigin(request);
  const input=LandingLabInput.parse(await body(request,80000));
  const client=clientBucket(request);
  limitBucket('landing-lab-'+client,10,86400000);
  limitBucket('landing-lab-global',60,86400000);
  // Separate from account records: no profile, library or chat history is read.
  const feedback=await model('landing-lab-'+client,landingLabTask,input,LandingLabFeedback,{maxTokens:450,timeoutMs:20000});
  return NextResponse.json({feedback},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}
}
