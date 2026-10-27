import {NextResponse}from'next/server';
import{requireSession,failure}from'@/lib/http';
import{renderDocumentPages}from'@/lib/document-files';
export const runtime='nodejs';export const maxDuration=120;
export async function GET(request:Request){try{const{state}=await requireSession(),query=new URL(request.url).searchParams,material=state.materials?.find(item=>item.id===query.get('materialId')),page=Number(query.get('page'));if(!material?.storageKey)throw Error('NOT_FOUND');const images=await renderDocumentPages(material.storageKey,page,page),data=images[0].dataUrl.slice('data:image/png;base64,'.length);return new NextResponse(new Uint8Array(Buffer.from(data,'base64')),{headers:{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}catch(error){return failure(error);}}
