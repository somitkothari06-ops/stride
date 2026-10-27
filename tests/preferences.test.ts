import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSession,getState } from "../lib/store";
import { ownedWorkspace } from "../lib/account-store";
import { PreferencesInput,PreferencesSchema,preferencesSnapshot,savePreferences } from "../lib/preferences";
import { themes,themeIds } from "../lib/themes";
process.env.STRIDE_DATA_DIR=mkdtempSync(join(tmpdir(),"stride-preferences-"));
test("appearance saves without changing coursework planning, survives account claim and stays isolated",()=>{
 const guest=createSession(false),before=guest.state;const snapshot=preferencesSnapshot(before);
 const result=savePreferences(guest.id,{...snapshot,preferences:{...snapshot.preferences,theme:"midnight",pattern:false,textSize:"large"}});
 assert.equal(result.workspaceRevision,before.revision);assert.deepEqual(getState(guest.id)?.works,before.works);
 const account=ownedWorkspace("appearance-owner",guest.token);assert.equal(preferencesSnapshot(account.state).preferences.theme,"midnight");
 assert.equal(preferencesSnapshot(ownedWorkspace("appearance-other").state).preferences.theme,"original");
 assert.throws(()=>savePreferences(account.id,{...snapshot,preferences:snapshot.preferences}),/SETTINGS_STALE/);
});
test("study settings invalidate prior planning but preserve unrelated personal records",()=>{
 const guest=createSession(false),snapshot=preferencesSnapshot(guest.state);const next=savePreferences(guest.id,{...snapshot,preferences:{...snapshot.preferences,minutes:60,timezone:"UTC"}});
 assert.equal(next.workspaceRevision,snapshot.workspaceRevision+1);assert.equal(getState(guest.id)?.profile.minutes,60);assert.equal(getState(guest.id)?.profile.timezone,"UTC");
 assert.equal(getState(guest.id)?.profile.name,guest.state.profile.name);
 assert.equal(PreferencesSchema.safeParse({...snapshot.preferences,timezone:"Not/A_Timezone"}).success,false);
 assert.equal(PreferencesInput.safeParse({...snapshot,preferences:{...snapshot.preferences,theme:"url(javascript:bad)"}}).success,false);
});
function lum(hex:string){return hex.slice(1).match(/../g)!.map(value=>parseInt(value,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);}
test("selectable palettes retain readable main foreground/background pairs",()=>{
 for(const id of themeIds){const t=themes[id];for(const [a,b]of [[t.ink,t.bg],[t.muted,t.bg],[t.ink,t.surface],[t.heroInk,t.hero],[t.heroMuted,t.hero],[t.ctaInk,t.cta]]){const [low,high]=[lum(a),lum(b)].sort((a,b)=>a-b);assert.ok((high+.05)/(low+.05)>=4.5,id);}}
});
