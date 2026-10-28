import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.STRIDE_NEXT_DIST_DIR === ".next-a" ? ".next-a" : process.env.STRIDE_NEXT_DIST_DIR === ".next-b" ? ".next-b" : ".next",
  poweredByHeader: false,
  serverExternalPackages: ["pdf-parse", "mammoth", "fflate", "fast-xml-parser"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};
export default config;
