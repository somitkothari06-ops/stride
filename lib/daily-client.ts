import { requestJson, connectionMessage } from "./client-request";
export type DailySnapshot={preferences:{enabled:boolean;hour:number;version:number};signedIn:boolean;lastRun:{status:string;updated:string;attempts:number}|null};
const url="/api/daily-preparation";
export async function readDaily():Promise<DailySnapshot>{return requestJson(url,{cache:"no-store"},{retryNetwork:true});}
export async function updateDaily(before:DailySnapshot,enabled:boolean,hour:number):Promise<{snapshot:DailySnapshot;notice?:string}>{
 try {
  return {snapshot:await requestJson<DailySnapshot>(url,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled,hour,version:before.preferences.version})})};
 } catch(error) {
  // PUT increments a version. Never replay it after an ambiguous network failure.
  try {
   const snapshot=await readDaily();
   if(snapshot.signedIn&&snapshot.preferences.enabled===enabled&&snapshot.preferences.hour===hour&&snapshot.preferences.version>before.preferences.version)return {snapshot};
   return {snapshot,notice:snapshot.preferences.version!==before.preferences.version?"These settings changed in another tab. Your latest settings are shown; try your change again.":connectionMessage(error,"Couldn’t confirm your change. Your saved setting is shown. Please try again.")};
  }catch{
   throw new Error("Couldn’t confirm your change. Reconnect and reload these settings before trying again.");
  }
 }
}
