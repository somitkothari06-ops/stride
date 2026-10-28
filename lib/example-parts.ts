/** Reveal existing source text progressively; never invent or discard a step. */
export function exampleParts(text:string){
 if(text.includes('```'))return [text];
 const paragraphs=text.split(/\n\s*\n/).flatMap(value=>value.split(/\n(?=\s*(?:\d+[.)]|Step \d+[:.)]))/)).map(value=>value.trim()).filter(Boolean);
 const parts=paragraphs.length>1?paragraphs:text.trim().split(/(?<=[.!?])\s+(?=[A-Z“"\d])/).filter(Boolean);
 if(parts.length<=12)return parts.length?parts:[text];
 return [...parts.slice(0,11),parts.slice(11).join('\n\n')];
}
