import {NextResponse} from 'next/server';
import {requireSession,failure} from '@/lib/http';
export const runtime='nodejs';
export async function GET(){try{const {state}=await requireSession();return NextResponse.json({name:state.profile.name,demo:!!state.demo},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
