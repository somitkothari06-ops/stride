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
export function validateLesson(lesson:Lesson,pages:{locator:string;text:string}[],imageLocators:string[]=[]){for(const item of lesson.evidence){if(item.basis==="image"){if(item.quote.length>500||!imageLocators.includes(item.locator))throw Error("STUDY_EVIDENCE_INVALID");}else if(!pages.some(page=>page.locator===item.locator&&page.text.includes(item.quote)))throw Error("STUDY_EVIDENCE_INVALID");}return lesson.evidence.some(item=>item.quote.length>500)?{...lesson,evidence:lesson.evidence.map(item=>item.quote.length>500?{...item,quote:item.quote.slice(0,500),excerptShortened:true}:item)}:lesson;}
