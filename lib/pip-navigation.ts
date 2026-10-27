export type PipLaunch = {id:string;text:string;autoSend:true;createdAt:number};
const key="stride-pip-launch";
export function launchPipChat(text?:string) {
 if(text?.trim())try{sessionStorage.setItem(key,JSON.stringify({id:crypto.randomUUID(),text:text.trim().slice(0,3000),autoSend:true,createdAt:Date.now()}));}catch{/* Chat still opens if browser storage is blocked. */}
 window.location.assign("/pip");
}
export function readPipLaunch():PipLaunch|undefined {
 try{const item=JSON.parse(sessionStorage.getItem(key)||"null");if(item&&typeof item.id==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)&&typeof item.text==="string"&&item.text.length<=3000&&Number.isFinite(item.createdAt)&&Date.now()-item.createdAt<900000)return item;sessionStorage.removeItem(key);}catch{/* An invalid draft must not block opening chat. */}
}
export function completePipLaunch(id:string) {
 try{const item=JSON.parse(sessionStorage.getItem(key)||"null");if(item?.id===id)sessionStorage.removeItem(key);}catch{/* Workspace chat is already persisted independently. */}
}
