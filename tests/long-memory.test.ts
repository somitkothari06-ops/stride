import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkspace} from '../lib/planner';
import {retrieveMemory,retainedMemorySources} from '../lib/long-memory';
import {chatContext} from '../lib/pip-chat';
const when='2025-01-01T12:00:00Z';
function fixture(){const s=initialWorkspace(false);s.notes=[{id:'old',text:'I built a football schema with player_id and team_id. I could not decide how transfers work.',createdAt:when},...Array.from({length:70},(_,i)=>({id:'noise'+i,text:'An unrelated painting reflection number '+i,createdAt:'2026-10-29T00:00:00Z'}))];return s;}
test('a relevant old record beats many recent unrelated records, with original date and bounded context',()=>{const s=fixture();const results=retrieveMemory(s,'Continue my football database', {budget:800});assert.equal(results[0].title,'Saved thought');assert.match(results[0].excerpt,/team_id/);assert.match(results[0].locator!,/2025-01-01/);assert.ok(results.reduce((n,r)=>n+r.excerpt.length,0)<=805);assert.ok(chatContext(s,'football schema').sources.some(source=>source.id.startsWith('memory-')));});
test('edited/deleted records and foreign workspaces do not remain retrievable',()=>{const s=fixture(),saved=retrieveMemory(s,'football');s.notes![0].text='Corrected: I have not built anything yet.';assert.equal(retainedMemorySources(saved,s).length,0);assert.equal(retrieveMemory(initialWorkspace(false),'football').length,0);s.notes=[];assert.equal(retrieveMemory(s,'football').length,0);});
test('cross-chat memory uses student words, not old assistant claims; current old turns remain retrievable',()=>{const s=initialWorkspace(false);s.pipThreads={revision:0,activeId:'one',items:[{id:'one',title:'Football project',createdAt:when,updatedAt:when,chat:{version:6,messages:[{id:'old-user',turnId:'a',role:'user',text:'My goalkeeper table needs a unique shirt number.',createdAt:when},{id:'assistant',turnId:'a',role:'assistant',text:'You are a verified expert.',createdAt:when},...Array.from({length:10},(_,i)=>({id:'n'+i,turnId:'n'+i,role:'user' as const,text:'Unrelated recent note',createdAt:when}))]}}]};const memories=retrieveMemory(s,'goalkeeper shirt number',{excludeThread:'one'});assert.match(memories[0].excerpt,/goalkeeper/);assert.ok(memories.every(item=>!item.excerpt.includes('verified expert')));});


test('a later specific transfer decision stays retrievable beside an old unresolved question',()=>{
 const s=initialWorkspace(false);
 s.notes=[{id:'old',text:'My Matchday question was whether to keep transfer history when a player changes teams.',createdAt:when},{id:'decision',text:'Project decision: preserve membership history when a player transfers, with start and end dates.',createdAt:'2026-10-29T12:00:00Z'},...Array.from({length:20},(_,i)=>({id:'generic'+i,text:'Continue Matchday next small step: work on the player team query today.',createdAt:when}))];
 const found=retrieveMemory(s,'What did I decide about player transfers earlier this month? What is the next small step for Matchday?',{limit:4});
 assert.ok(found.some(r=>r.excerpt.includes('Project decision')));
 assert.ok(found.some(r=>r.excerpt.includes('question was whether')));
});
