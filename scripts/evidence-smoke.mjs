import assert from'node:assert/strict';import{deflateSync}from'node:zlib';
const base=process.env.STRIDE_BASE_URL||'http://localhost:3188',live=process.argv.includes('--allow-live');
function syntheticBlocks(){
 const width=400,height=220;
 function crc(bytes){let value=0xffffffff;for(const byte of bytes){value^=byte;for(let n=0;n<8;n++)value=(value>>>1)^((value&1)?0xedb88320:0);}return(value^0xffffffff)>>>0;}
 function chunk(kind,data){const name=Buffer.from(kind),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([name,data])),data.length+8);return out;}
 const rows=Buffer.alloc((width*3+1)*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const at=y*(width*3+1)+1+x*3;rows[at]=x<width/2?220:40;rows[at+1]=x<width/2?45:80;rows[at+2]=x<width/2?45:220;}
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
async function boot(){const r=await fetch(base+'/api/workspace?fresh=1');assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
if(!live&&!/^http:\/\/(127\.0\.0\.1|localhost):/.test(base))throw Error('Pass --allow-live for an external service.');
const a=await boot(),b=await boot();
async function call(path,method='GET',data,cookie=a){const r=await fetch(base+path,{method,headers:{Cookie:cookie,...(method==='GET'?{}:{Origin:base}),...(data instanceof FormData?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:data instanceof FormData?data:JSON.stringify(data)})});return{status:r.status,data:await r.json()};}
const start=await call('/api/focus','POST',{action:'start',title:'Explain my two-block drawing',minutes:20});assert.equal(start.status,200,JSON.stringify(start.data));const focusId=start.data.state.focus.id;
assert.equal((await call('/api/focus','POST',{action:'pause',focusId:'wrong-focus'})).status,404);
assert.equal((await call('/api/focus','POST',{action:'pause',focusId})).status,200);assert.equal((await call('/api/focus')).data.focus.id,focusId);assert.equal((await call('/api/focus','POST',{action:'resume',focusId})).status,200);
const invalid=new FormData();invalid.set('text','Synthetic invalid file');invalid.set('files',new Blob(['not a picture']),'bad.png');assert.equal((await call('/api/evidence','POST',invalid)).status,400);
const form=new FormData();const words='I made a two-block drawing. Please inspect the attached image and identify the colors and their sides.';form.set('text',words);form.set('activityDate','2026-10-27');form.set('files',new Blob([syntheticBlocks()],{type:'image/png'}),'synthetic-blocks.png');
const preview=await call('/api/evidence','POST',form);assert.equal(preview.status,200,JSON.stringify(preview.data));
assert.equal(preview.data.candidate.studentExplanation,words);assert.equal((await call('/api/evidence')).data.entries.length,0);
if(live){assert.equal(preview.data.mode,'model',JSON.stringify(preview.data));assert.match(preview.data.candidate.artifactShows,/red/i);assert.match(preview.data.candidate.artifactShows,/blue/i);}else assert.equal(preview.data.mode,'unassessed');
const key=preview.data.attachments[0].key;assert.equal((await fetch(base+'/api/evidence/attachment?key='+key,{headers:{Cookie:a}})).status,200);assert.equal((await fetch(base+'/api/evidence/attachment?key='+key,{headers:{Cookie:b}})).status,404);
const payload={reviewId:preview.data.reviewId,candidate:preview.data.candidate,activityDate:preview.data.activityDate};
assert.equal((await call('/api/evidence','PUT',{...payload,candidate:{...payload.candidate,modelFeedback:'I verified mastery.'}})).status,400);
const saved=await call('/api/evidence','PUT',payload);assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.state.evidence.entries.length,1);assert.equal(saved.data.state.evidence.entries[0].originalSubmission,words);assert.equal((await call('/api/evidence','PUT',payload)).data.state.evidence.entries.length,1);
const entryId=saved.data.state.evidence.entries[0].id;
const close={action:'close',focusId,summary:'I made and explained a two-block drawing.',nextStep:'Try a different arrangement.'};assert.equal((await call('/api/focus','POST',close)).status,200);assert.equal((await call('/api/focus','POST',close)).data.state.evidence.entries.length,2);assert.equal((await call('/api/focus')).data.card.kind,'saved');assert.equal((await call('/api/focus','POST',{action:'skipReturn'})).data.card,null);
const exported=await call('/api/evidence');assert.equal(exported.data.entries.length,2);assert.ok(exported.data.entries[0].observed.attachments.length);
assert.equal((await call('/api/evidence','DELETE',{id:entryId},b)).status,404);assert.equal((await call('/api/evidence','DELETE',{id:entryId})).status,200);assert.equal((await fetch(base+'/api/evidence/attachment?key='+key,{headers:{Cookie:a}})).status,404);
if(live){const plain=new FormData();const text='I practised LEFT JOIN using two tables and explained why an unmatched row stays.';plain.set('text',text);plain.set('files',new Blob(['Synthetic note: A LEFT JOIN preserves all rows from its left table.'],{type:'text/plain'}),'synthetic-notes.txt');const review=await call('/api/evidence','POST',plain,b);assert.equal(review.status,200,JSON.stringify(review.data));assert.equal(review.data.mode,'model',JSON.stringify(review.data));const result=await call('/api/evidence','PUT',{reviewId:review.data.reviewId,candidate:review.data.candidate,activityDate:null},b);assert.equal(result.status,200);assert.equal(result.data.state.evidence.entries[0].originalSubmission,text);assert.equal((await call('/api/evidence','DELETE',{id:result.data.state.evidence.entries[0].id},b)).status,200);}
console.log(JSON.stringify({passed:true,liveVision:live,liveText:live,mode:preview.data.mode,sourceOwned:true,reviewTamperingRejected:true,saveAndCloseReplaySafe:true,originalPreserved:true,resumeAndSkip:true,exportAndDelete:true}));
