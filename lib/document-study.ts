import { z } from "zod";
import type { CourseMaterial } from "./course-types";
export const DocumentLesson=z.object({visualUncertainty:z.array(z.string().max(500)).max(8).default([]),title:z.string().min(3).max(160),prerequisite:z.string().max(800),explanation:z.string().min(100).max(6500),workedExample:z.string().min(50).max(4000),commonMistake:z.string().min(10).max(1000),question:z.string().min(5).max(800),evidence:z.array(z.object({locator:z.string().max(40),quote:z.string().min(8).max(24000),excerptShortened:z.boolean().optional(),basis:z.enum(["text","image"]).default("text")})).min(1).max(4)});
export type Lesson=z.infer<typeof DocumentLesson>;
export function documentPageCount(material:CourseMaterial){return material.coverage?.totalPages||material.pages.reduce((n,page)=>Math.max(n,Number(page.locator.match(/^(?:Page|Slide) (\d+)/)?.[1]||0)),0)||material.pages.length;}
export function selectStudyPages(material:CourseMaterial,from:number,count:number,allowVisuals=false){
 const total=documentPageCount(material);if(from>total)throw Error("NOT_FOUND");const to=Math.min(total,from+count-1);
 const pages=material.pages.filter((page,index)=>{const n=Number(page.locator.match(/^(?:Page|Slide) (\d+)/)?.[1]||index+1);return n>=from&&n<=to;});
 if(!allowVisuals&&pages.reduce((n,p)=>n+p.text.trim().length,0)<30)throw Error("STUDY_NO_TEXT");
 if(pages.reduce((n,p)=>n+p.text.length,0)>24000)throw Error("STUDY_RANGE_TOO_LARGE");
 return {from,to,total,pages};
}
// Preserve the original excerpt while accepting equivalent PDF line wrapping.
export function exactStudyExcerpt(text:string,quote:string):string|null{
 if(text.includes(quote))return quote;
 const chars:string[]=[],starts:number[]=[],ends:number[]=[];
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(/\s/u.test(char)){
   if(chars.at(-1)===' '){ends[ends.length-1]=i+1;continue;}
   chars.push(' ');
  }else chars.push(char);
  starts.push(i);ends.push(i+1);
 }
 const needle=quote.replace(/\s+/gu,' ').trim();
 if(needle.length<8)return null;
 const at=chars.join('').indexOf(needle);
 return at<0?null:text.slice(starts[at],ends[at+needle.length-1]);
}
export function validateLesson(lesson:Lesson,pages:{locator:string;text:string}[],imageLocators:string[]=[]){
 const evidence=lesson.evidence.map(item=>{
  if(item.basis==="image"){
   if(item.quote.length>500||!imageLocators.includes(item.locator))throw Error("STUDY_EVIDENCE_INVALID");
   return item;
  }
  let quote:string|null=null;
  for(const page of pages){if(page.locator===item.locator){quote=exactStudyExcerpt(page.text,item.quote);if(quote!==null)break;}}
  if(quote===null)throw Error("STUDY_EVIDENCE_INVALID");
  if(quote===item.quote&&quote.length<=500)return item;
  return {...item,quote:quote.length>500?quote.slice(0,500):quote,...(quote.length>500?{excerptShortened:true}:{})};
 });
 return evidence.every((item,index)=>item===lesson.evidence[index])?lesson:{...lesson,evidence};
}
