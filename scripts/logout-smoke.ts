import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ownedWorkspace,createAccountSession,findAccountSession } from "../lib/account-store";
import { db,mutate,sessionId } from "../lib/store";
if(!process.argv.includes("--allow-write"))throw Error("Synthetic accounts only; pass --allow-write.");
async function main(){
const base=process.env.STRIDE_BASE_URL||"https://stride-213-239-171-145.sslip.io";
const user="logout-smoke-"+randomUUID(),owned=ownedWorkspace(user);
mutate(owned.id,state=>{state.profile.name="Synthetic private logout sentinel";state.profile.onboardingComplete=true;});
const token=createAccountSession(user,"synthetic-access","synthetic-refresh",Date.now()/1000+3600);
let guestId:string|undefined;
try{
 const response=await fetch(base+"/api/account",{method:"POST",headers:{Origin:base,Cookie:"stride_account="+token,"Content-Type":"application/json"},body:JSON.stringify({action:"signout"})});assert.equal(response.status,200);assert.equal(findAccountSession(token),null);
 for(const route of ["/api/account","/api/workspace","/api/pip-chat","/api/preferences","/api/study"]){assert.equal((await fetch(base+route,{headers:{Cookie:"stride_account="+token}})).status,401,route);}
 const fresh=await fetch(base+"/api/workspace");assert.equal(fresh.status,200);const guestCookie=fresh.headers.get("set-cookie")!.split(";")[0];guestId=sessionId(guestCookie.slice(guestCookie.indexOf("=")+1));const guest=await fresh.json();assert.equal(guest.account,null);assert.equal(guest.state.sample,false);assert.notEqual(guest.state.profile.name,"Synthetic private logout sentinel");assert.equal(guest.state.works.length,0);
 assert.equal(ownedWorkspace(user).state.profile.name,"Synthetic private logout sentinel");
 console.log(JSON.stringify({passed:true,serverSessionRevoked:true,oldCookieRejectedOnFiveRoutes:true,guestIsSeparate:true,accountDataPreserved:true,realAccountsTouched:0}));
}finally{db().prepare("DELETE FROM account_sessions WHERE user_id=?").run(user);db().prepare("DELETE FROM sessions WHERE id=? AND user_id=?").run(owned.id,user);if(guestId)db().prepare("DELETE FROM sessions WHERE id=? AND user_id IS NULL").run(guestId);}

}
void main().catch(error=>{console.error(error);process.exitCode=1;});
