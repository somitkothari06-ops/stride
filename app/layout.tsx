import type { Metadata } from "next";
import "./globals.css";
import "./signal.css";
import "./themes.css";
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
      <head><script dangerouslySetInnerHTML={{__html:`(()=>{try{const all=${JSON.stringify(themes)},fallback=${JSON.stringify(defaultAppearance)},p=JSON.parse(localStorage.getItem('stride-appearance')||'null')||fallback;const t=Object.hasOwn(all,p.theme)?all[p.theme]:all.original;const h=document.documentElement;for(const [k,v]of Object.entries(t))if(k!=='name'&&k!=='note')h.style.setProperty('--theme-'+k,v);h.dataset.appearance=Object.hasOwn(all,p.theme)?p.theme:'original';h.dataset.textSize=p.textSize==='large'?'large':'standard';h.dataset.motion=p.motion==='reduced'?'reduced':'system';h.dataset.pattern=String(p.pattern!==false);}catch{}})();`}}/></head>
      <body><AppearanceProvider>{children}<Companion/></AppearanceProvider></body>
    </html>
  );
}
