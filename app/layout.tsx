import type { Metadata } from "next";
import "./globals.css";
import "./signal.css";
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
      <body>{children}</body>
    </html>
  );
}
