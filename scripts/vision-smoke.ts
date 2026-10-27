import assert from "node:assert/strict";
import {randomUUID}from"node:crypto";
import{writeFile,rm,mkdtemp}from"node:fs/promises";
import{join}from"node:path";
import{tmpdir}from"node:os";
import{z}from"zod";
import{createSession,db}from"../lib/store";
import{retainPdf,renderDocumentPages,removePdf}from"../lib/document-files";
import{model}from"../lib/ai";
if(!process.argv.includes("--allow-live"))throw Error("Pass --allow-live for one synthetic vision request.");
async function main(){const dir=await mkdtemp(join(tmpdir(),"stride-vision-")),path=join(dir,"synthetic.pdf"),from="LUMA"+randomUUID().slice(0,3).toUpperCase(),to="TARO"+randomUUID().slice(0,3).toUpperCase();
const content=`1 w 20 70 100 50 re S 240 70 100 50 re S 120 95 m 235 95 l S 222 102 m 235 95 l 222 88 l S BT /F1 12 Tf 29 90 Td (${from}) Tj ET BT /F1 12 Tf 249 90 Td (${to}) Tj ET`;
const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 360 180] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];let pdf="%PDF-1.4\n",offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(o=>`${String(o).padStart(10,"0")} 00000 n \n`).join("")+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;await writeFile(path,pdf,{mode:0o600});let key:string|undefined;const guest=createSession(false);
try{key=await retainPdf(path);const images=await renderDocumentPages(key,1,1);assert.equal(images[0].page,1);await writeFile(".runtime/synthetic-vision.png",Buffer.from(images[0].dataUrl.slice("data:image/png;base64,".length),"base64"),{mode:0o600});if(process.argv.includes("--render-only")){console.log(JSON.stringify({rendered:true,modelCalls:0}));return;}const result=await model(guest.id,"Read the two box labels in the image and the direction of the arrow between them. Return JSON {from:string,to:string} naming the arrow's source and target. Use only the image; do not invent labels.",{},z.object({from:z.string(),to:z.string()}),{maxTokens:700,images:[images[0].dataUrl]});assert.equal(result.from.replace(/[^a-z0-9]/gi,"").toUpperCase(),from);assert.equal(result.to.replace(/[^a-z0-9]/gi,"").toUpperCase(),to);console.log(JSON.stringify({passed:true,pdfPageRendered:true,randomDiagramLabelsRead:true,arrowDirectionCorrect:true,model:process.env.NEBIUS_MODEL_VISION,userPDFViewed:false}));}finally{if(key)await removePdf(key);await rm(dir,{recursive:true,force:true});db().prepare("DELETE FROM sessions WHERE id=? AND user_id IS NULL").run(guest.id);}}
void main().catch(error=>{console.error(error instanceof Error?error.message:"Vision check failed");process.exitCode=1;});
