import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdf-parse", "mammoth", "fflate", "fast-xml-parser"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};
export default config;
