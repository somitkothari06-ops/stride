import { ArrowUpRight, Layers3 } from 'lucide-react';
import type { StudentBuild } from '@/lib/build-types';
export default function BuildPortal({project}:{project:StudentBuild|null}){
 return <a className="build-portal" href="/build"><span className="build-portal-symbol" aria-hidden="true"><Layers3 size={30}/></span><span className="build-portal-copy"><span className="build-portal-label">MY BUILD{project?.paused?' · PAUSED':''}</span><strong>{project?project.title:'Make something that’s yours.'}</strong><span>{project?(project.awaitingNext?'Your attempt is saved. Choose what comes next.':project.current.title):'Turn what you’re learning into something you can build on.'}</span></span><span className="build-portal-go"><span>{project?'Open build':'Find my first step'}</span><ArrowUpRight size={24}/></span></a>;
}
