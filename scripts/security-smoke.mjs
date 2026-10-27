import assert from 'node:assert/strict';
const base=process.env.STRIDE_BASE_URL||'https://stride-213-239-171-145.sslip.io';
const routes=['/api/action','/api/intake','/api/materials','/api/course-bridge','/api/companion','/api/introduction','/api/pip-chat','/api/account','/api/account/oauth','/api/study'];
for(const path of routes){
 for(const origin of [undefined,'null','https://untrusted.example',base.replace('https:','http:')]){
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:'{}'});
  assert.equal(response.status,403,`${path}: ${origin||'missing origin'}`);
 }
}
for(const origin of [undefined,'null','https://untrusted.example',base.replace('https:','http:')]){const r=await fetch(base+'/api/preferences',{method:'PUT',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:'{}'});assert.equal(r.status,403);}
for(const path of ['/.env.local' ,'/.data/stride.sqlite','/.backups/','/lib/auth.ts']) assert.equal((await fetch(base+path)).status,404,path);
const revoked=await fetch(base+'/api/account',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:'stride_account='+'a'.repeat(64)},body:JSON.stringify({action:'signout'})});
assert.equal(revoked.status,200);const clear=revoked.headers.getSetCookie();for(const name of ['stride_account','stride_session','stride_oauth'])assert.ok(clear.some(value=>value.startsWith(name+'=')&&/Max-Age=0/i.test(value)));
console.log(JSON.stringify({passed:true,mutationRoutesChecked:routes.length,missingNullForeignAndDowngradedOriginsRefused:true,privatePathsNotServed:true,logoutClearsDeviceCookies:true,modelCalls:0,realAccountsTouched:0}));
