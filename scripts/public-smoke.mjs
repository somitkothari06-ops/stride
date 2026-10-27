import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
if(!process.argv.includes('--allow-write'))throw new Error('Pass --allow-write to create a disposable public guest and OAuth attempts. No model calls or provider consent are performed.');
const base=process.env.STRIDE_BASE_URL||'https://stride-213-239-171-145.sslip.io';assert.equal(new URL(base).protocol,'https:');
const health=await fetch(base+'/api/health');assert.equal(health.status,200);assert.match(health.headers.get('strict-transport-security')||'',/max-age=/);
const response=await fetch(base+'/api/workspace?fresh=1');assert.equal(response.status,200);const setCookie=response.headers.get('set-cookie');assert.match(setCookie,/; Secure/i);assert.match(setCookie,/; HttpOnly/i);const cookie=setCookie.split(';')[0];
if(process.env.STRIDE_SMOKE_IDS_FILE){const file=process.env.STRIDE_SMOKE_IDS_FILE,ids=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];ids.push(createHash('sha256').update(cookie.split('=')[1]).digest('hex'));writeFileSync(file,JSON.stringify(ids),{mode:0o600});}
const options=await fetch(base+'/api/account/oauth').then(r=>r.json());assert.equal(options.github,true);
for(const provider of ['github','google'].filter(name=>options[name])){
 const start=await fetch(base+'/api/account/oauth',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({provider})});assert.equal(start.status,200);assert.match(start.headers.get('set-cookie')||'',/; Secure/i);
 const url=new URL((await start.json()).url);assert.equal(url.protocol,'https:');assert.equal(url.searchParams.get('redirect_to'),base+'/api/account/oauth/callback');assert.equal(url.searchParams.get('code_challenge_method'),'s256');
 const oauth=start.headers.get('set-cookie').split(';')[0];const cancel=await fetch(base+'/api/account',{method:'POST',headers:{Origin:base,Cookie:cookie+'; '+oauth,'Content-Type':'application/json'},body:JSON.stringify({action:'continueGuest'})});assert.equal(cancel.status,200);
}
const forbidden=await fetch(base+'/api/account/oauth',{method:'POST',headers:{Origin:'https://unrelated.example','Content-Type':'application/json'},body:JSON.stringify({provider:'github'})});assert.equal(forbidden.status,403);
const callback=await fetch(base+'/api/account/oauth/callback?code=synthetic-invalid',{redirect:'manual'});assert.equal(callback.status,303);assert.equal(callback.headers.get('location'),base+'/login?oauth_error=retry');
console.log(JSON.stringify({status:'passed',publicHTTPS:true,secureCookies:true,pinnedOAuthCallbacks:true,crossOriginRefusal:true,googleEnabled:options.google,githubEnabled:options.github,modelCalls:0}));
