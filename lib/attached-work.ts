import {randomUUID} from 'node:crypto';
import type {Workspace} from './types';
import type {MaterialDraft} from './course-types';
import type {z} from 'zod';
import type {ConfirmSchema} from './types';
export function saveAttachedWork(state:Workspace,materialId:string,candidate:MaterialDraft,work?:z.infer<typeof ConfirmSchema>,now=new Date().toISOString()){
 const existingMaterial=state.materials?.some(material=>material.id===materialId);
 const existingWork=work&&state.works.some(item=>item.materialId===materialId);
 if(!existingMaterial&&(state.materials?.length||0)>=12)throw Error('LIBRARY_FULL');
 if(work&&!existingWork&&state.works.length>=60)throw Error('INPUT_TOO_LARGE');
 if(!existingMaterial)state.materials=[...(state.materials||[]),{...candidate,...(work?{subject:work.subject}:{}),id:materialId,addedAt:now}];
 if(work&&!existingWork)state.works.push({...work,uncertainty:'',materialId,id:randomUUID(),createdAt:now,completed:false});
 if(!existingMaterial||work&&!existingWork){state.revision++;state.prepared=null;state.direction=null;}
}
