import assert from 'node:assert/strict';
if(!process.argv.includes('--allow-live'))throw Error('Pass --allow-live for synthetic course search and comparison.');
const base=process.env.STRIDE_BASE_URL||'http://127.0.0.1:3000';
async function boot(){const r=await fetch(base+'/api/workspace?fresh=1');assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
const a=await boot(),b=await boot();
async function post(path,data,cookie=a){const r=await fetch(base+path,{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};}
const subject='Computer networks';const form=new FormData();form.set('subject',subject);form.set('kind','Lecture notes');form.set('file',new Blob(['Computer networks use protocols to exchange packets. TCP provides reliable ordered delivery. IP forwards packets between networks. Routing determines a path; transport protocols connect applications.'],{type:'text/plain'}),'synthetic-networks.txt');
let r=await fetch(base+'/api/materials',{method:'POST',headers:{Cookie:a,Origin:base},body:form});assert.equal(r.status,200);const draft=await r.json();r=await fetch(base+'/api/materials',{method:'PUT',headers:{Cookie:a,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(draft)});assert.equal(r.status,200);
const found=await post('/api/course-references',{subject});assert.equal(found.status,200,JSON.stringify(found.data));assert.ok(found.data.references.length,'Expected at least one educational course source');const selection=found.data.references[0];
assert.equal((await post('/api/course-bridge',{subject,selection},b)).status,400);
assert.equal((await post('/api/course-bridge',{subject:'Operating systems',selection})).status,400);
assert.equal((await post('/api/course-bridge',{subject,selection:{...selection,reference:{...selection.reference,focus:'Fabricated outside content must not be used.'}}})).status,400);
const compared=await post('/api/course-bridge',{subject,selection});assert.equal(compared.status,200,JSON.stringify(compared.data));assert.ok(compared.data.comparison.localFocus.length);assert.ok(compared.data.comparison.externalFocus.length);assert.equal(compared.data.benchmark.url,selection.reference.url);
console.log(JSON.stringify({passed:true,customSubject:subject,sourceCount:found.data.references.length,sourceHost:new URL(selection.reference.url).hostname,discoveredSourceComparison:true,rejectsForeignWorkspaceSubjectAndTampering:true}));
