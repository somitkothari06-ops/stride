export type DeskTool={id:string;title:string;href:string;tone:string};
export const deskTools:DeskTool[]=[
 {id:'today',title:'Today',href:'/workspace?view=today',tone:'notes'},
 {id:'work',title:'Coursework',href:'/workspace?view=work',tone:'notes'},
 {id:'build',title:'My Build',href:'/build',tone:'build'},
 {id:'pip',title:'Pip',href:'/pip',tone:'pip'},
 {id:'journal',title:'Journal',href:'/journal',tone:'journal'},
 {id:'memory',title:'Progress',href:'/workspace?view=memory',tone:'notes'},
 {id:'direction',title:'Explore',href:'/workspace?view=direction',tone:'build'},
];
// Accept only app-owned tools. Never allow an external URL into a desk window.
export function deskToolFor(href:string):DeskTool|null{
 if(!href.startsWith('/')||href.startsWith('//')||href.includes('\\'))return null;
 let u:URL;try{u=new URL(href,'https://stride.invalid');}catch{return null;}
 if(u.origin!=='https://stride.invalid')return null;
 u.searchParams.delete('desktopPanel');
 if(u.pathname==='/workspace'){
  const theme=u.searchParams.get('themePreview');
  if(theme&&/^[a-z-]{1,30}$/.test(theme))return {id:`preview-${theme}-${u.searchParams.get('buttonStyle')||'theme'}`,title:'Theme preview',href:u.pathname+u.search,tone:'notes'};
  const open=u.searchParams.get('open');
  if(open==='course')return {id:'library',title:'Course library',href:u.pathname+u.search,tone:'notes'};
  if(open==='integrations')return {id:'connections',title:'Connections',href:u.pathname+u.search,tone:'notes'};
  const view=u.searchParams.get('view')||'today';
  const tool=deskTools.find(t=>t.id===view);if(!tool||!['today','work','memory','direction'].includes(view))return null;
  return {...tool,href:u.pathname+u.search};
 }
 const tool=deskTools.find(t=>t.href===u.pathname);
 if(tool)return {...tool,href:u.pathname+u.search};
 if(u.pathname==='/settings'||u.pathname==='/about-you')return {id:u.pathname.slice(1),title:u.pathname==='/settings'?'Settings':'Your profile',href:u.pathname+u.search,tone:'pip'};
 if(/^\/study\/[a-zA-Z0-9_-]+$/.test(u.pathname))return {id:u.pathname,title:'Your notes',href:u.pathname+u.search,tone:'notes'};
 return null;
}
export function panelHref(href:string){const u=new URL(href,'https://stride.invalid');u.searchParams.set('desktopPanel','1');return u.pathname+u.search;}
export type DeskWindow=DeskTool & {x:number;y:number;width:number;height:number;z:number;minimised:boolean;maximised:boolean};
export function focusDeskWindow(windows:DeskWindow[],id:string):DeskWindow[]{const z=Math.max(0,...windows.map(w=>w.z))+1;return windows.map(w=>w.id===id?{...w,minimised:false,z}:w);}
export function openDeskWindow(windows:DeskWindow[],tool:DeskTool,bounds:{width:number;height:number}):DeskWindow[]{
 if(windows.some(w=>w.id===tool.id))return focusDeskWindow(windows,tool.id);
 const width=Math.min(bounds.width,Math.max(500,bounds.width*(windows.length?0.63:0.9))),height=Math.min(bounds.height,Math.max(360,bounds.height*0.94));
 const step=windows.length%5;
 const next:DeskWindow={...tool,x:Math.min(bounds.width-width,24+step*40),y:Math.min(bounds.height-height,step*16),width,height,z:Math.max(0,...windows.map(w=>w.z))+1,minimised:false,maximised:false};
 return [...windows,next];
}
// First-party programmatic navigation keeps the current tool mounted in a desk.
export function openAppTool(href:string):boolean{
 if(typeof window==='undefined'||window.self===window.top||!deskToolFor(href))return false;
 window.parent.postMessage({channel:'stride-desk',type:'open',href},window.location.origin);return true;
}
export function tileDeskWindows(windows:DeskWindow[],bounds:{width:number;height:number},limit:2|4):DeskWindow[]{
 const visible=windows.filter(w=>!w.minimised).sort((a,b)=>b.z-a.z).slice(0,limit);
 if(!visible.length)return windows;
 const cols=visible.length===1?1:2,rows=Math.ceil(visible.length/cols),gap=16;
 const width=(bounds.width-gap*(cols-1))/cols,height=(bounds.height-gap*(rows-1))/rows;
 return windows.map(w=>{const i=visible.findIndex(v=>v.id===w.id);return i<0?{...w,minimised:true}:{...w,x:(i%cols)*(width+gap),y:Math.floor(i/cols)*(height+gap),width,height,maximised:false};});
}
