import { NextResponse } from "next/server";
import { body,checkOrigin,failure,requireSession } from "@/lib/http";
import { PreferencesInput,preferencesSnapshot,savePreferences } from "@/lib/preferences";
import { defaultAppearance } from "@/lib/themes";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(){try{const session=await requireSession();return NextResponse.json({...preferencesSnapshot(session.state),account:session.account?{email:session.account.email}:null},{headers});}catch(error){if(error instanceof Error&&error.message==="SESSION_EXPIRED")return NextResponse.json({preferences:{...defaultAppearance,minutes:30,timezone:"Asia/Kolkata"},version:0,workspaceRevision:0,account:null,uninitialised:true},{headers});return failure(error);}}
export async function PUT(request:Request){try{checkOrigin(request);const input=PreferencesInput.parse(await body(request,5000));const session=await requireSession();
 const result=savePreferences(session.id,input);const response=NextResponse.json(result,{headers});return response;
}catch(error){return failure(error);}}
