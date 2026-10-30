import {randomUUID} from 'node:crypto';
import type {Workspace} from './types';
import type {EvidenceEntry} from './evidence';

// An illustrative month, never login telemetry or verified student attainment.
// Original demo text only; private college files are imported per session.
export const monthSessions = [
 ['Choose a project','I chose a football organiser because our class group keeps losing track of teams. I wrote down players, teams, matches and availability.','Sketch the first two tables.'],
 ['Players and teams','I separated Player from Team instead of copying the team name onto every player. I can now change one team name in one place.','Choose stable identifiers.'],
 ['Keys that stay put','I used player_id and team_id rather than a name as the primary key. Two people can have the same name.','Represent a player with no team.'],
 ['Leave room for an unknown team','I made Player.team_id nullable. Dev has not chosen a team yet; inventing a team called None would hide that difference.','Compare INNER JOIN and LEFT JOIN.'],
 ['Keep the unmatched player','INNER JOIN drops Dev. LEFT JOIN keeps Dev and returns NULL for the team columns. I traced three rows by hand.','Find only the unmatched players.'],
 ['A filter that changes the answer','Filtering the team name in WHERE can remove an unmatched player. I wrote the expected result before changing the query.','Put the condition in the join and compare.'],
 ['Trace a ready queue','I stepped through round-robin scheduling with three processes and a time quantum of two. Waiting time is not the same as turnaround time.','Try a different quantum.'],
 ['A smaller time quantum','With a smaller quantum, processes take more turns. I counted context switches rather than assuming smaller is always better.','Draw a timeline.'],
 ['When memory is full','I traced FIFO with three frames. On a miss, the oldest resident page leaves. A repeated page already in memory should not cause replacement.','Contrast FIFO and LRU.'],
 ['Oldest is not least recently used','FIFO remembers arrival order; LRU remembers use. I found a sequence where they choose different victims.','Write the frame states down.'],
 ['A tiny list of players','I wrote a JavaScript array of player objects and filtered entries whose team is null. This is a small feature rather than a whole website.','Try the empty list.'],
 ['The empty-list case','An empty input should return an empty result. I also added two unassigned players so the filter cannot pass by returning the first item.','Keep the cases as a text file.'],
 ['Design the match table','Match needs a time and two teams. A team cannot play itself. I wrote this rule before trying to add an interface.','Show the next match.'],
 ['Availability is its own fact','A player can be available for one match and absent for another. I sketched Availability(player_id,match_id,status).','Decide how to handle a missing reply.'],
 ['Trace a network slowdown','I drew the difference between flow control and congestion control. The receiver and the network are different bottlenecks.','Use the actual lecture PDF next time.'],
 ['One useful index','An index on team_id might help a lookup. I cannot call it faster without measuring a real query plan and a representative dataset.','Describe the query before adding indexes.'],
 ['A player changes teams','Keeping only the current team could make old match records misleading. I wrote down a separate membership-history idea.','Decide when a membership begins and ends.'],
 ['Explain the schema aloud','I explained why Player has its own key and how a nullable foreign key keeps an unassigned player. The confusing part was historical membership.','Keep that question for the next session.'],
 ['Bring the parts together','I connected the unmatched-player query to the team finder. I have a written schema and a small filter; I have not deployed a full match organiser.','Try a LEFT JOIN result beside the JavaScript output.'],
 ['Plan the next small feature','The next feature is finding who still needs a team. I want to keep unmatched players visible and explain every row in the result.','Try showing an unmatched player in Matchday.'],
] as const;

export function addDemoMonth(state:Workspace,now:Date){
 const ago=(days:number)=>new Date(now.getTime()-days*86400000).toISOString();
 const entries:EvidenceEntry[]=monthSessions.map(([title,explanation,next],i)=>{
  const createdAt=ago(29-Math.floor(i*28/19));
  return {id:randomUUID(),createdAt,activityDate:createdAt.slice(0,10),kind:'session',assessment:'unassessed',focusId:randomUUID(),reported:{activity:`Focused session: ${title}`,explanation},observed:{artifactShows:'',attachments:[]},modelFeedback:'',uncertainty:'Illustrative sample history. These are not measured logins or verified student achievements.',nextSuggestion:next};
 });
 state.evidence={entries:[...(state.evidence?.entries||[]),...entries]};
 if(state.build?.project)state.build.project.createdAt=ago(29);
 state.notes=[...(state.notes||[]),{id:randomUUID(),createdAt:ago(16),text:'Sample memory: I learn better if I predict the result before running the code. Please ask me to explain one row rather than giving me five exercises.'},{id:randomUUID(),createdAt:ago(7),text:'Sample project decision: do not overwrite old team membership when a player transfers. Matchday will eventually need dates on memberships.'}];
}
