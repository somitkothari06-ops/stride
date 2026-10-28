import test from 'node:test';
import assert from 'node:assert/strict';
import {roleSearchQuery,reusableDirection} from '../lib/role-search';
import {ActionSchema,type Direction} from '../lib/types';
test('role search preserves questions and locations instead of forcing India internships',()=>{
 assert.equal(roleSearchQuery('  How can I get into robotics?  '),'How can I get into robotics?');
 assert.equal(roleSearchQuery('Data engineering internships Berlin'),'Data engineering internships Berlin');
 assert.equal(roleSearchQuery('AI'),'AI careers skills entry level');
 assert.equal(roleSearchQuery('Data   engineering'),'Data engineering careers skills entry level');
 assert.equal(ActionSchema.parse({action:'direction',role:'AI'}).action,'direction');
 assert.equal(ActionSchema.safeParse({action:'direction',role:'  '}).success,false);
});
test('recent role results can be reused only for the same query and valid recent timestamp',()=>{
 const now=Date.now(),d={searchId:'synthetic-search',role:'Data engineering',updatedAt:new Date(now-1000).toISOString()} as Direction;
 assert.equal(reusableDirection(d,' data engineering ',now),true);
 assert.equal(reusableDirection(d,'Robotics',now),false);
 assert.equal(reusableDirection({...d,updatedAt:new Date(now-900001).toISOString()},d.role,now),false);
 assert.equal(reusableDirection({...d,updatedAt:new Date(now+1000).toISOString()},d.role,now),false);
 assert.equal(reusableDirection({...d,updatedAt:'invalid'},d.role,now),false);
});
