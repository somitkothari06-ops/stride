import { readFile,writeFile,mkdir,chmod,unlink } from "node:fs/promises";
import { join,dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
const uuid=z.uuid();let activeRenders=0;
export function documentFile(key:string){uuid.parse(key);return join(process.env.STRIDE_DATA_DIR||join(process.cwd(),".data"),"documents",key+".pdf");}
export async function retainPdf(source:string){const key=randomUUID(),path=documentFile(key);await mkdir(dirname(path),{recursive:true,mode:0o700});await chmod(dirname(path),0o700);await writeFile(path,await readFile(source),{mode:0o600,flag:"wx"});return key;}
export async function removePdf(key:string){try{await unlink(documentFile(key));}catch(error){if(!(error instanceof Error)||!("code"in error)||error.code!=="ENOENT")throw error;}}
export async function renderDocumentPages(key:string,from:number,to:number){if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>500||to-from>=5)throw Error("INVALID_REQUEST");
 if(activeRenders>=2)throw Error("STUDY_BUSY");activeRenders++;
 try{const {stdout}=await promisify(execFile)(process.execPath,["--max-old-space-size=384",join(process.cwd(),"scripts/render-course.mjs"),documentFile(key),String(from),String(to)],{timeout:40000,maxBuffer:28000000,env:{PATH:process.env.PATH,NODE_ENV:"production"}});return z.array(z.object({page:z.number().int().positive(),dataUrl:z.string().startsWith("data:image/png;base64,").max(5000000)})).min(1).max(5).parse(JSON.parse(stdout));}catch{throw Error("DOCUMENT_RENDER_FAILED");}finally{activeRenders--;}}
