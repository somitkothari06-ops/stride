"use client";
import { createContext,useCallback,useContext,useEffect,useRef,useState } from "react";
import { AppearanceSchema,appearanceFrom,appearanceVars,defaultAppearance,themeIds,buttonStyleIds,type ThemeId,type Appearance } from "@/lib/themes";
const cacheKey="stride-appearance";
export function applyAppearance(value:Appearance){for(const [key,color] of Object.entries(appearanceVars(value.theme,value.buttonStyle)))document.documentElement.style.setProperty(key,color);document.documentElement.dataset.appearance=value.theme;document.documentElement.dataset.buttonStyle=value.buttonStyle;document.documentElement.dataset.textSize=value.textSize;document.documentElement.dataset.motion=value.motion;document.documentElement.dataset.pattern=String(value.pattern);document.documentElement.dataset.wallpaper=value.wallpaper;document.documentElement.dataset.dockSize=value.dockSize;document.documentElement.dataset.windowStyle=value.windowStyle;document.documentElement.dataset.deskFolders=String(value.deskFolders);document.documentElement.dataset.deskClock=String(value.deskClock);}
export function clearAppearance(){try{localStorage.removeItem(cacheKey);}catch{}applyAppearance(defaultAppearance);}
const AppearanceContext=createContext<{appearance:Appearance;preview:(value:Appearance)=>void;commit:(value:Appearance)=>void;restore:()=>void}>({appearance:defaultAppearance,preview:()=>{},commit:()=>{},restore:()=>{}});
export function useAppearance(){return useContext(AppearanceContext);}
export default function AppearanceProvider({children}:{children:React.ReactNode}){
 const [appearance,setAppearance]=useState<Appearance>(defaultAppearance),saved=useRef<Appearance>(defaultAppearance),previewing=useRef(false),epoch=useRef(0),requestId=useRef(0);
 const commit=useCallback((input:Appearance)=>{const value=appearanceFrom(input);delete document.documentElement.dataset.themePreview;epoch.current++;saved.current=value;previewing.current=false;setAppearance(value);applyAppearance(value);try{localStorage.setItem(cacheKey,JSON.stringify(value));}catch{}},[]);
 const restore=useCallback(()=>{delete document.documentElement.dataset.themePreview;epoch.current++;previewing.current=false;setAppearance(saved.current);applyAppearance(saved.current);},[]);
 useEffect(()=>{
  try{const parsed=AppearanceSchema.safeParse(JSON.parse(localStorage.getItem(cacheKey)||"null"));if(parsed.success)commit(parsed.data);}catch{}
  const requested=new URLSearchParams(window.location.search).get("themePreview");if(requested&&themeIds.includes(requested as ThemeId)){previewing.current=true;epoch.current++;const params=new URLSearchParams(window.location.search);const requestedStyle=params.get("buttonStyle");const buttonStyle=requestedStyle&&buttonStyleIds.includes(requestedStyle as Appearance["buttonStyle"])?requestedStyle as Appearance["buttonStyle"]:saved.current.buttonStyle;const value={...saved.current,theme:requested as ThemeId,buttonStyle};applyAppearance(value);setAppearance(value);document.documentElement.dataset.themePreview=requested;}
  let active=true;
  const refresh=async()=>{const started=epoch.current,request=++requestId.current;try{const response=await fetch("/api/preferences",{cache:"no-store"});const data=await response.json();if(!active||started!==epoch.current||request!==requestId.current)return;if(response.status===401){previewing.current=false;saved.current=defaultAppearance;setAppearance(defaultAppearance);clearAppearance();return;}if(previewing.current)return;if(!response.ok){if(response.status===401){saved.current=defaultAppearance;setAppearance(defaultAppearance);clearAppearance();}return;}const value=appearanceFrom(data.preferences);commit(value);}catch{}};
  void refresh();window.addEventListener("focus",refresh);
  const storage=(event:StorageEvent)=>{if(event.key!==cacheKey||previewing.current)return;try{const parsed=AppearanceSchema.safeParse(JSON.parse(event.newValue||"null"));if(parsed.success){epoch.current++;saved.current=parsed.data;setAppearance(parsed.data);applyAppearance(parsed.data);}}catch{}};
  window.addEventListener("storage",storage);
  const channel=typeof BroadcastChannel==="undefined"?null:new BroadcastChannel("stride-account");if(channel)channel.onmessage=event=>{if(event.data==="signed-out"){saved.current=defaultAppearance;setAppearance(defaultAppearance);clearAppearance();}};
  return()=>{active=false;window.removeEventListener("focus",refresh);window.removeEventListener("storage",storage);channel?.close();};
 },[commit]);
 return <AppearanceContext.Provider value={{appearance,preview:value=>{epoch.current++;previewing.current=true;setAppearance(value);applyAppearance(value);},commit,restore}}>{children}</AppearanceContext.Provider>;
}
