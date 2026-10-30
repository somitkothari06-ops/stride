import {test} from 'node:test';
import assert from 'node:assert/strict';
import {navigationActivity} from '../lib/navigation-activity';
import type {Workspace} from '../lib/types';
test('navigation counts open work and active build without inventing messages',()=>{
 const state={works:[{completed:false},{completed:true},{completed:false}],materials:[{}],notes:[{},{}],evidence:{entries:[{}]},build:{project:{paused:false}}} as unknown as Workspace;
 assert.deepEqual(navigationActivity(state),{coursework:2,materials:1,build:1,journal:1,thoughts:2});
 state.build!.project!.paused=true;assert.equal(navigationActivity(state).build,0);
 assert.deepEqual(navigationActivity({works:[]} as unknown as Workspace),{coursework:0,materials:0,build:0,journal:0,thoughts:0});
});
