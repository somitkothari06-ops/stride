import { z } from "zod";
import { AppearanceSchema, defaultAppearance } from "./themes";
import type { Workspace } from "./types";
import { mutate } from "./store";
const timezone=z.string().min(1).max(80).refine(value=>{try{new Intl.DateTimeFormat("en",{timeZone:value});return true;}catch{return false;}},"Choose a valid timezone");
export const PreferencesSchema=AppearanceSchema.extend({minutes:z.number().int().min(5).max(180),timezone}).strict();
export const PreferencesInput=z.object({preferences:PreferencesSchema,version:z.number().int().nonnegative(),workspaceRevision:z.number().int().nonnegative()}).strict();
export function preferencesSnapshot(state:Workspace){return {preferences:{...defaultAppearance,...state.appearance,minutes:state.profile.minutes,timezone:state.profile.timezone},version:state.preferencesVersion||0,workspaceRevision:state.revision};}
export function savePreferences(id:string,input:z.infer<typeof PreferencesInput>){return preferencesSnapshot(mutate(id,state=>{
 if((state.preferencesVersion||0)!==input.version||state.revision!==input.workspaceRevision)throw new Error("SETTINGS_STALE");
 const {minutes,timezone,...appearance}=input.preferences;
 state.appearance=appearance;state.preferencesVersion=(state.preferencesVersion||0)+1;
 if(state.profile.minutes!==minutes||state.profile.timezone!==timezone){state.profile.minutes=minutes;state.profile.timezone=timezone;state.revision++;state.plan=null;state.prepared=null;state.direction=null;}
}));}
