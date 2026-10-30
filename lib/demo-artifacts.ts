import {randomUUID} from 'node:crypto';
import type {Workspace} from './types';
import {prepareAttachment} from './evidence';
import {retainEvidence,removeEvidence} from './evidence-files';

// Original, downloadable demonstration files. They are not college material,
// execution receipts or proof of a person's authorship.
const files=[
 {name:'matchday-query.txt',days:12,title:'Keep every player in a team lookup',text:'-- Original Stride demonstration artifact\nSELECT p.player_id, p.name, t.name AS team\nFROM Player p\nLEFT JOIN Team t ON p.team_id = t.team_id;\n\n-- Find only players with no matching team\nSELECT p.name FROM Player p\nLEFT JOIN Team t ON p.team_id = t.team_id\nWHERE t.team_id IS NULL;\n',explanation:'I kept Player on the left. A missing match becomes NULL on the Team side. These are sample queries, not recorded database execution.'},
 {name:'matchday-test-cases.md',days:8,title:'Write down the cases before adding more code',text:'# Original demonstration test cases\n\n- No players: return an empty list.\n- All players assigned: return an empty list.\n- Dev has a null team: return Dev.\n- Two players without teams: return both.\n- A player changing teams: keep their ID stable.\n\nThese are written expectations, not an automated test report.\n',explanation:'I listed empty input, all assigned and multiple unassigned players. The file records expected behaviour; no passing test claim is implied.'},
];
export async function addDemoArtifacts(state:Workspace,now=new Date()){
 const retained:{key:string;extension:string}[]=[];
 try{
  for(const file of files){const uploadedAt=now.toISOString(),bytes=new TextEncoder().encode(file.text),attachment=prepareAttachment(file.name,bytes,uploadedAt);await retainEvidence(attachment.key,attachment.extension,bytes);retained.push(attachment);
   const createdAt=new Date(now.getTime()-file.days*86400000).toISOString();
   state.evidence??={entries:[]};state.evidence.entries.push({id:randomUUID(),createdAt,activityDate:createdAt.slice(0,10),kind:'evidence',assessment:'unassessed',reported:{activity:file.title,explanation:file.explanation},observed:{artifactShows:`Original sample ${file.name}; available to open and download.`,attachments:[attachment]},modelFeedback:'',uncertainty:'Illustrative demo artifact, not verified student work. Files were created for this demo today; the activity date is part of the sample history.',nextSuggestion:'Try the example and explain the result.'});
  }
  return retained;
 }catch(error){await Promise.all(retained.map(f=>removeEvidence(f.key,f.extension)));throw error;}
}
