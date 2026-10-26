import type { Metadata } from "next";
import "./globals.css";
import "./signal.css";
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
    <html lang="en">
      <body>{children}<Companion/></body>
    </html>
  );
}
