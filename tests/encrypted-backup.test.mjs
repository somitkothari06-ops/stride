import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {encryptSnapshot,decryptSnapshot} from '../scripts/encrypted-backup.mjs';
test('encrypted snapshots round trip privately and never overwrite existing files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'stride-encrypted-')),source=join(dir,'source'),key=join(dir,'key'),encrypted=join(dir,'snapshot.enc'),restored=join(dir,'restored');
 const original=Buffer.from('synthetic private workspace data');writeFileSync(source,original);encryptSnapshot(source,key,encrypted);
 assert.equal(statSync(key).mode&0o777,0o600);assert.equal(statSync(encrypted).mode&0o777,0o600);assert.equal(readFileSync(encrypted).includes(original),false);
 decryptSnapshot(encrypted,key,restored);assert.deepEqual(readFileSync(restored),original);
 assert.throws(()=>encryptSnapshot(source,key,encrypted),/EEXIST/);assert.throws(()=>decryptSnapshot(encrypted,key,restored),/EEXIST/);assert.deepEqual(readFileSync(restored),original);
});
test('tampering and the wrong key never publish a plaintext file',()=>{
 const dir=mkdtempSync(join(tmpdir(),'stride-tampered-')),source=join(dir,'source'),key=join(dir,'key'),encrypted=join(dir,'snapshot.enc'),bad=join(dir,'bad'),output=join(dir,'output');
 writeFileSync(source,'private');encryptSnapshot(source,key,encrypted);const bytes=readFileSync(encrypted);bytes[bytes.length-1]^=1;writeFileSync(bad,bytes);
 assert.throws(()=>decryptSnapshot(bad,key,output));assert.equal(existsSync(output),false);
 const wrong=join(dir,'wrong-key');writeFileSync(wrong,Buffer.alloc(32,42));assert.throws(()=>decryptSnapshot(encrypted,wrong,output));assert.equal(existsSync(output),false);
});
