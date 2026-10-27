import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {readFileSync,openSync,writeFileSync,closeSync,fsyncSync,chmodSync,mkdirSync,rmSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const magic=Buffer.from('STRIDE-BACKUP-GCM-1\n');
function writeNew(path,bytes){
 mkdirSync(dirname(resolve(path)),{recursive:true,mode:0o700});
 const fd=openSync(path,'wx',0o600);let complete=false;
 try{writeFileSync(fd,bytes);fsyncSync(fd);complete=true;}finally{closeSync(fd);if(!complete)rmSync(path);}
 const directory=openSync(dirname(resolve(path)),'r');try{fsyncSync(directory);}finally{closeSync(directory);}
}
function readKey(path,create){
 if(create){mkdirSync(dirname(resolve(path)),{recursive:true,mode:0o700});try{writeNew(path,randomBytes(32));}catch(error){if(error.code!=='EEXIST')throw error;}}
 chmodSync(path,0o600);const key=readFileSync(path);if(key.length!==32)throw new Error('Invalid backup key');return key;
}
export function encryptSnapshot(source,keyPath,destination){
 const key=readKey(keyPath,true),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(magic);
 const encrypted=Buffer.concat([cipher.update(readFileSync(source)),cipher.final()]);
 writeNew(destination,Buffer.concat([magic,iv,cipher.getAuthTag(),encrypted]));
}
export function decryptSnapshot(source,keyPath,destination){
 const bytes=readFileSync(source);if(bytes.length<magic.length+28||!bytes.subarray(0,magic.length).equals(magic))throw new Error('Invalid encrypted snapshot');
 const start=magic.length,decipher=createDecipheriv('aes-256-gcm',readKey(keyPath,false),bytes.subarray(start,start+12));
 decipher.setAAD(magic);decipher.setAuthTag(bytes.subarray(start+12,start+28));
 const plain=Buffer.concat([decipher.update(bytes.subarray(start+28)),decipher.final()]);writeNew(destination,plain);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [operation,source,key,destination]=process.argv.slice(2);if(!['encrypt','decrypt'].includes(operation)||!source||!key||!destination)throw new Error('Usage: node scripts/encrypted-backup.mjs encrypt|decrypt SNAPSHOT KEY_FILE NEW_OUTPUT');
 if(operation==='encrypt')encryptSnapshot(source,key,destination);else decryptSnapshot(source,key,destination);
 console.log(JSON.stringify({operation,status:'complete'}));
}
