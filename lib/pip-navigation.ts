export type PipLaunch = {id:string;text:string;autoSend:boolean;createdAt:number;threadId?:string};
const key="stride-pip-launch";
export function launchPipChat(text?:string,autoSend=true,threadId?:string) {
 if(text?.trim())try{sessionStorage.setItem(key,JSON.stringify({id:crypto.randomUUID(),text:text.trim().slice(0,3000),autoSend,createdAt:Date.now(),threadId}));}catch{if(!autoSend)return false;/* Lesson chat can still open without its request. */}
 window.location.assign("/pip");
 return true;
}
export function readPipLaunch():PipLaunch|undefined {
 try{const item=JSON.parse(sessionStorage.getItem(key)||"null");if(item&&typeof item.id==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)&&typeof item.autoSend==="boolean"&&typeof item.text==="string"&&item.text.length<=3000&&Number.isFinite(item.createdAt)&&Date.now()-item.createdAt<900000){if(item.threadId!==undefined&&typeof item.threadId!=="string")return;return item;}sessionStorage.removeItem(key);}catch{/* An invalid draft must not block opening chat. */}
}
export function completePipLaunch(id:string) {
 try{const item=JSON.parse(sessionStorage.getItem(key)||"null");if(item?.id===id)sessionStorage.removeItem(key);}catch{/* Workspace chat is already persisted independently. */}
}
