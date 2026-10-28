import {limitBucket} from "./client-limits";
let active=0;const recent=new Map<string,{start:number;count:number}>();
export function acquireUpload(owner:string,now=Date.now(),client?:string){for(const[id,item]of recent)if(now-item.start>=600000)recent.delete(id);if(active>=2)throw Error('UPLOAD_BUSY');if(client)limitBucket('upload-'+client,30,600000,now);const item=recent.get(owner)||{start:now,count:0};if(item.count>=6)throw Error('UPLOAD_RATE_LIMIT');item.count++;recent.set(owner,item);active++;let released=false;return()=>{if(!released){active--;released=true;}};}
