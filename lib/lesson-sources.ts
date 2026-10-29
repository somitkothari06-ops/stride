import {z} from 'zod';
import {DocumentLesson,type Lesson} from './document-study';
type Source={id:string;locator:string;basis:'text'|'image';quote:string};
export function lessonSourceContract(pages:{locator:string;text:string}[],imageLocators:string[]=[]){
 const sources:Source[]=[];
 for(const page of pages){
  for(let start=0;start<page.text.length;){
   let end=Math.min(start+220,page.text.length);
   if(end<page.text.length){const space=page.text.lastIndexOf(' ',end);if(space>start+100)end=space;}
   const quote=page.text.slice(start,end).trim();start=end;
   if(quote.length>=8)sources.push({id:'text-'+(sources.length+1),locator:page.locator,basis:'text',quote});
  }
 }
 for(const locator of imageLocators)sources.push({id:'image-'+(sources.length+1),locator,basis:'image',quote:''});
 if(!sources.length)throw Error('STUDY_NO_TEXT');
 const ids=sources.map(s=>s.id) as [string,...string[]];
 const schema=DocumentLesson.omit({evidence:true}).extend({evidence:z.array(z.object({sourceId:z.enum(ids),description:z.string().max(500)})).min(1).max(4)});
 return {sources,schema,resolve(value:z.infer<typeof schema>):Lesson{
  return {...value,evidence:value.evidence.map(item=>{
   const source=sources.find(s=>s.id===item.sourceId);if(!source)throw Error('STUDY_EVIDENCE_INVALID');
   const quote=source.basis==='text'?source.quote:item.description.trim();
   if(quote.length<8)throw Error('STUDY_EVIDENCE_INVALID');
   return {locator:source.locator,basis:source.basis,quote};
  })};
 }};
}
