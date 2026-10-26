// Local setup tool. Provider secrets go only to Supabase configuration, never
// into Stride's runtime environment, source archive or console output.
import { readFileSync, chmodSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const apply = process.argv.includes("--apply");
const version = execFileSync("supabase",["--version"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim().match(/^(\d+)\.(\d+)\.(\d+)/);
if (!version || Number(version[1]) !== 2 || Number(version[2]) < 122) throw new Error("Use Supabase CLI 2.122+ (2.x), whose config push preserves undeclared remote settings.");
const file = ".env.oauth.local";
const values = {};
try {
  chmodSync(file, 0o600);
  const input = readFileSync(file,"utf8");
  if (input.length > 16000) throw new Error();
  for (const line of input.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#") || !line.includes("=")) continue;
    const split = line.indexOf("="), key = line.slice(0,split).trim();
    let value = line.slice(split+1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1,-1);
    values[key] = value;
  }
} catch { throw new Error("Create the private .env.oauth.local file first. No credentials were printed."); }
const project = readFileSync("supabase/.temp/project-ref","utf8").trim();
if (!/^[a-z]{20}$/.test(project)) throw new Error("Link the intended Supabase project first.");
const configured = [];
let config = 'project_id = "stride"\n';
const env = { ...process.env };
for (const provider of ["google","github"]) {
  const prefix = `STRIDE_${provider.toUpperCase()}`;
  const id = values[prefix+"_CLIENT_ID"], secret = values[prefix+"_CLIENT_SECRET"];
  if (!id && !secret) continue;
  if (!id || !secret || !/^[a-zA-Z0-9_.:-]+$/.test(id) || /[\r\n]/.test(secret)) throw new Error(`Complete both ${provider} credential fields privately before continuing.`);
  config += `\n[auth.external.${provider}]\nenabled = true\nclient_id = ${JSON.stringify(id)}\nsecret = "env(${prefix}_CLIENT_SECRET)"\n`;
  env[prefix+"_CLIENT_SECRET"] = secret;
  configured.push(provider);
}
if (!configured.length) throw new Error("No provider credentials saved yet. Fill .env.oauth.local; keep secrets out of chat.");
if (!apply) console.log(`Credential fields present for: ${configured.join(", ")}. Run with --apply to send only these provider settings to the linked Supabase project.`);
else {
  const dir = mkdtempSync(join(tmpdir(),"stride-oauth-config-"));
  try {
    mkdirSync(join(dir,"supabase"),{mode:0o700});
    writeFileSync(join(dir,"supabase/config.toml"),config,{mode:0o600});
    execFileSync("supabase",["config","push","--workdir",dir,"--project-ref",project,"--yes","--output-format","text"],{env,stdio:"pipe",timeout:60000});
    console.log(`Supabase provider configuration saved for: ${configured.join(", ")}. Verify a real consent/return flow before calling sign-in working.`);
  } catch { throw new Error("Provider setup failed. Check CLI login and the private credential fields. Provider responses were suppressed to protect secrets."); }
  finally { rmSync(dir,{recursive:true,force:true}); }
}
