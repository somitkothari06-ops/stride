/** Retry only read requests or writes whose server merge is explicitly replay-safe. */
export async function requestJson<T>(url:string,init:RequestInit={},options:{retryNetwork?:boolean}={}):Promise<T>{
 for(let attempt=0;;attempt++){
  try{
   const response=await fetch(url,init);
   const data=await response.json();
   if(!response.ok)throw Error(data.error?.message||"That request couldn’t complete. Please try again.");
   return data as T;
  }catch(error){
   if(!options.retryNetwork||attempt>=1||!(error instanceof TypeError||error instanceof SyntaxError))throw error;
   await new Promise(resolve=>setTimeout(resolve,800));
  }
 }
}
export function connectionMessage(error:unknown,fallback:string){
 return error instanceof Error && !(error instanceof TypeError) && !(error instanceof SyntaxError) ? error.message : fallback;
}
