import {readFile}from'node:fs/promises';
import {createRequire}from'node:module';
import {dirname,join}from'node:path';
const require=createRequire(import.meta.url);
const standardFontDataUrl=join(dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts/');
import{PDFParse}from'pdf-parse';
export async function renderCourse(path,from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>500||to-from>=5)throw Error('Invalid range');const bytes=await readFile(path);if(bytes.length>8*1024*1024)throw Error('Oversized PDF');const parser=new PDFParse({data:bytes,isEvalSupported:false,standardFontDataUrl});try{const info=await parser.getInfo();if(to>info.total)throw Error('Range beyond document');const result=await parser.getScreenshot({partial:Array.from({length:to-from+1},(_,i)=>from+i),desiredWidth:1400,imageBuffer:false,imageDataUrl:true});return result.pages.map(p=>({page:p.pageNumber,dataUrl:p.dataUrl}));}finally{await parser.destroy();}}
if(process.argv[1]?.endsWith('render-course.mjs')){try{console.log(JSON.stringify(await renderCourse(process.argv[2],Number(process.argv[3]),Number(process.argv[4]))));}catch{console.error('Could not render selected PDF pages.');process.exitCode=1;}}
