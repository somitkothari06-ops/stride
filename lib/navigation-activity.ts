import type {Workspace} from './types';
export type NavigationActivity={coursework:number;materials:number;build:number;journal:number;thoughts:number};
// These are inventories/action counts, never fabricated unread-message counts.
export function navigationActivity(state:Workspace):NavigationActivity{
 const project=state.build?.project;
 return {coursework:state.works.filter(work=>!work.completed).length,materials:state.materials?.length||0,build:project&&!project.paused?1:0,journal:state.evidence?.entries.length||0,thoughts:state.notes?.length||0};
}
