import{requestJson,RequestError}from'./client-request';import type{PipSnapshot}from'./types';
export async function loadPipSnapshot(threadId?:string):Promise<PipSnapshot>{
 const url='/api/pip-chat'+(threadId?`?threadId=${encodeURIComponent(threadId)}`:'');
 try{return await requestJson<PipSnapshot>(url,{cache:'no-store'},{retryNetwork:true});}catch(error){
  // Existing sessions need one read, not a bootstrap waterfall. Only an expired
  // guest identity may use the existing guest bootstrap; never mask auth errors.
  if(!(error instanceof RequestError)||error.code!=='SESSION_EXPIRED')throw error;
  await requestJson('/api/workspace?fresh=1&bootstrap=1',{cache:'no-store'},{retryNetwork:true});
  return requestJson<PipSnapshot>(url,{cache:'no-store'},{retryNetwork:true});
 }
}
