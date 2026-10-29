import {z}from'zod';
export function structuredResponseFormat(schema:z.ZodType){
 try{
  const json=z.toJSONSchema(schema,{io:'input',unrepresentable:'any',target:'draft-7'});
  if(json.type!=='object')return{type:'json_object'} as const;
  const {$schema:version,...shape}=json;void version;
  return{type:'json_schema',json_schema:{name:'stride_response',strict:true,schema:shape}} as const;
 }catch{return{type:'json_object'} as const;}
}
