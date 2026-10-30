import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSession,getState,mutate } from "../lib/store";
import { ownedWorkspace } from "../lib/account-store";
import { PreferencesInput,PreferencesSchema,preferencesSnapshot,savePreferences } from "../lib/preferences";
import { themes,themeIds,buttonStyleIds,AppearanceSchema,appearanceVars,buttonColors,defaultAppearance } from "../lib/themes";
process.env.STRIDE_DATA_DIR=mkdtempSync(join(tmpdir(),"stride-preferences-"));
test("appearance saves without changing coursework planning, survives account claim and stays isolated",()=>{
 const guest=createSession(false),before=guest.state;const snapshot=preferencesSnapshot(before);
 const result=savePreferences(guest.id,{...snapshot,preferences:{...snapshot.preferences,theme:"midnight",pattern:false,textSize:"large"}});
 assert.equal(result.workspaceRevision,before.revision);assert.deepEqual(getState(guest.id)?.works,before.works);
 const account=ownedWorkspace("appearance-owner",guest.token);assert.equal(preferencesSnapshot(account.state).preferences.theme,"midnight");
 assert.equal(preferencesSnapshot(ownedWorkspace("appearance-other").state).preferences.theme,defaultAppearance.theme);
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
test("every theme and button style resolves a readable button pair",()=>{
 for(const id of themeIds)for(const style of buttonStyleIds){const vars=appearanceVars(id,style);const [low,high]=[lum(vars["--theme-ctaInk"]),lum(vars["--theme-cta"])].sort((a,b)=>a-b);assert.ok((high+.05)/(low+.05)>=4.5,`${id}/${style}`);}
});
test("button styles resolve from the intended palette sources",()=>{
 for(const id of themeIds){const t=themes[id];assert.deepEqual(buttonColors(id,"theme"),{background:t.cta,foreground:t.ctaInk});assert.deepEqual(buttonColors(id,"bold"),{background:t.ink,foreground:t.surface});assert.deepEqual(buttonColors(id,"soft"),{background:t.tint,foreground:t.ink});assert.deepEqual(buttonColors(id,"focus"),{background:t.hero,foreground:t.heroInk});assert.equal(appearanceVars(id,"soft")["--theme-ctaInk"],t.ink);}
});
test("stored appearances without a button style default to the theme choice and invalid styles are rejected",()=>{
 const legacy={theme:"midnight",textSize:"standard",motion:"system",pattern:true};
 const parsed=AppearanceSchema.safeParse(legacy);
 assert.equal(parsed.success,true);
 assert.equal(parsed.success&&parsed.data.buttonStyle,"theme");
 assert.equal(defaultAppearance.buttonStyle,"theme");
 assert.equal(AppearanceSchema.safeParse({...legacy,buttonStyle:"neon"}).success,false);
 assert.equal(AppearanceSchema.safeParse({...legacy,buttonStyle:"url(javascript:bad)"}).success,false);
 assert.equal(AppearanceSchema.safeParse({...legacy,buttonStyle:7}).success,false);
});

test("appearance changes merge with newer coursework and unrelated settings",()=>{
 const g=createSession(false),s=preferencesSnapshot(g.state);
 mutate(g.id,w=>{w.revision++;w.profile.minutes=55;w.preferencesVersion=1;});
 const next=savePreferences(g.id,{...s,base:s.preferences,preferences:{...s.preferences,theme:"midnight"}});
 assert.equal(next.preferences.theme,"midnight");assert.equal(next.preferences.minutes,55);assert.equal(next.workspaceRevision,s.workspaceRevision+1);
});
test("same-field conflicts are rejected but a lost-response replay is idempotent",()=>{
 const g=createSession(false),s=preferencesSnapshot(g.state),input={...s,base:s.preferences,preferences:{...s.preferences,theme:"midnight" as const}};
 const saved=savePreferences(g.id,input),replayed=savePreferences(g.id,input);
 assert.deepEqual(replayed,saved);
 assert.throws(()=>savePreferences(g.id,{...input,preferences:{...s.preferences,theme:"lemon"}}),/SETTINGS_STALE/);
 assert.equal(preferencesSnapshot(getState(g.id)!).preferences.theme,"midnight");
});
