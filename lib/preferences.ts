import { z } from "zod";
import { AppearanceSchema, defaultAppearance } from "./themes";
import type { Workspace } from "./types";
import { mutate } from "./store";
const timezone=z.string().min(1).max(80).refine(value=>{try{new Intl.DateTimeFormat("en",{timeZone:value});return true;}catch{return false;}},"Choose a valid timezone");
export const PreferencesSchema=AppearanceSchema.extend({minutes:z.number().int().min(5).max(180),timezone}).strict();
export const PreferencesInput=z.object({preferences:PreferencesSchema,base:PreferencesSchema.optional(),version:z.number().int().nonnegative(),workspaceRevision:z.number().int().nonnegative()}).strict();
export function preferencesSnapshot(state:Workspace){return {preferences:{...defaultAppearance,...state.appearance,minutes:state.profile.minutes,timezone:state.profile.timezone},version:state.preferencesVersion||0,workspaceRevision:state.revision};}
export function savePreferences(id:string,input:z.infer<typeof PreferencesInput>){return preferencesSnapshot(mutate(id,state=>{
 const current=preferencesSnapshot(state).preferences;
 let next=input.preferences;
 if(input.base){
  const keys=Object.keys(current) as (keyof typeof current)[];
  const changed=keys.filter(key=>input.preferences[key]!==input.base![key]);
  if(changed.some(key=>current[key]!==input.base![key]&&current[key]!==input.preferences[key]))throw Error("SETTINGS_STALE");
  next=PreferencesSchema.parse({...current,...Object.fromEntries(changed.map(key=>[key,input.preferences[key]]))});
 }else if((state.preferencesVersion||0)!==input.version||state.revision!==input.workspaceRevision)throw Error("SETTINGS_STALE");
 if(JSON.stringify(next)===JSON.stringify(current))return;
 const {minutes,timezone,...appearance}=next;
 state.appearance=appearance;state.preferencesVersion=(state.preferencesVersion||0)+1;
 if(state.profile.minutes!==minutes||state.profile.timezone!==timezone){state.profile.minutes=minutes;state.profile.timezone=timezone;state.revision++;state.plan=null;state.prepared=null;state.direction=null;}
}));}
