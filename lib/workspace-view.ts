import type {Workspace} from './types';
export function workspaceView(state:Workspace,fullExport=false):Workspace{
 if(fullExport)return state;
 const {pipChat:legacy,pipThreads:threads,...visible}=state;
 void legacy;void threads;
 return visible;
}
