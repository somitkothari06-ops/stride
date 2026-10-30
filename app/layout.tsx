import type { Metadata } from "next";
import "./globals.css";
import "./signal.css";
import "./themes.css";
import "./button-options.css";
import "./landing-refresh.css";
import "./file-picker.css";
import "./delight.css";
import "./build-portal.css";
import "./app-frame.css";
import "./studio-system.css";
import "./nordic-system.css";
import AppFrame from "@/components/app-frame";
import AppearanceProvider from "@/components/appearance-provider";
import { themes, defaultAppearance } from "@/lib/themes";
import Companion from "@/components/companion";
export const metadata: Metadata = {
  title: "Stride — make your work count",
  description:
    "A thoughtful workspace for college work, real progress and your next step.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:`(()=>{try{const all=${JSON.stringify(themes)},fallback=${JSON.stringify(defaultAppearance)},sources={theme:['cta','ctaInk'],bold:['ink','surface'],soft:['tint','ink'],focus:['hero','heroInk']},p=JSON.parse(localStorage.getItem('stride-appearance')||'null')||fallback;const t=Object.hasOwn(all,p.theme)?all[p.theme]:all[fallback.theme];const bs=sources[p.buttonStyle]?p.buttonStyle:'theme';const pair=sources[bs];const h=document.documentElement;for(const [k,v]of Object.entries(t))if(k!=='name'&&k!=='note')h.style.setProperty('--theme-'+k,v);h.style.setProperty('--theme-cta',t[pair[0]]);h.style.setProperty('--theme-ctaInk',t[pair[1]]);h.dataset.appearance=Object.hasOwn(all,p.theme)?p.theme:fallback.theme;h.dataset.buttonStyle=bs;h.dataset.textSize=p.textSize==='large'?'large':'standard';h.dataset.motion=p.motion==='reduced'?'reduced':'system';h.dataset.pattern=String(p.pattern!==false);}catch{}})();`}}/></head>
      <body><AppearanceProvider><AppFrame>{children}</AppFrame><Companion/></AppearanceProvider></body>
    </html>
  );
}
