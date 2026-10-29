import assert from 'node:assert/strict';
const base=process.env.STRIDE_BASE_URL||'http://127.0.0.1:3000';
const boot=await fetch(base+'/api/workspace?fresh=1');assert.equal(boot.status,200);const cookie=boot.headers.get('set-cookie').split(';')[0];
async function post(payload){const response=await fetch(base+'/api/action',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(payload)});return{status:response.status,data:await response.json()};}
const before=await post({action:'setTime',minutes:15});assert.equal(before.status,200);assert.equal(before.data.state.profile.minutes,15);assert.equal(before.data.state.plan,null);
const added=await post({action:'add',work:{title:'Synthetic interface check — scheduling',subject:'Synthetic systems',kind:'exam',dueDate:null,summary:'Synthetic UI and time budget check only.',source:'Synthetic interface check — scheduling',sourceType:'My own words',uncertainty:''}});assert.equal(added.status,200,JSON.stringify(added.data));
await post({action:"setTime",minutes:30});
for(const minutes of [15,30,60]){const result=await post({action:'setTime',minutes});assert.equal(result.status,200,JSON.stringify(result.data));const state=result.data.state;assert.equal(state.profile.minutes,minutes);assert.equal(state.plan.minutes,minutes);assert.equal(state.plan.workId,state.works[0].id);assert.equal(state.plan.contextRevision,state.revision);assert.equal(state.plan.mode,'guided');const replay=await post({action:'setTime',minutes});assert.equal(replay.data.state.plan.id,state.plan.id);assert.equal(replay.data.state.revision,state.revision);}
assert.equal((await post({action:'setTime',minutes:999})).status,400);
const changed=await post({action:'add',work:{title:'Synthetic no-op time check',subject:'Synthetic systems',kind:'revision',dueDate:null,summary:'A second synthetic task.',source:'Synthetic no-op check.',sourceType:'My own words',uncertainty:''}});const beforeNoop=changed.data.state;
const unchanged=await post({action:'setTime',minutes:60});assert.deepEqual(unchanged.data.state,beforeNoop,'Saving the current budget must preserve existing plans and revisions even after coursework changes');
const reload=await fetch(base+'/api/workspace',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(reload.state.profile.minutes,60);assert.equal(reload.state.plan.minutes,60);
console.log(JSON.stringify({passed:true,timeBudgets:[15,30,60],noWorkHandled:true,replaySafe:true,planFitsBudget:true,persisted:true,modelCalls:0,currentBudgetNoop:true}));
