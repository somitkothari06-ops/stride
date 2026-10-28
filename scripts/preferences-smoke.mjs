import assert from'node:assert/strict';
if(!process.argv.includes('--allow-write'))throw Error('Pass --allow-write for disposable preference checks.');
const base=process.env.STRIDE_BASE_URL||'http://127.0.0.1:3000',boot=await fetch(base+'/api/workspace?fresh=1'),cookie=boot.headers.get('set-cookie').split(';')[0];
async function snapshot(){const r=await fetch(base+'/api/preferences',{headers:{Cookie:cookie}});assert.equal(r.status,200);return r.json();}let s=await snapshot();
for(const buttonStyle of ['theme','bold','soft','focus']){const r=await fetch(base+'/api/preferences',{method:'PUT',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({version:s.version,workspaceRevision:s.workspaceRevision,base:s.preferences,preferences:{...s.preferences,buttonStyle}})});assert.equal(r.status,200);s=await snapshot();assert.equal(s.preferences.buttonStyle,buttonStyle);}
console.log(JSON.stringify({passed:true,allButtonStylesSaveAndReload:true,modelCalls:0}));
