import test from "node:test";
import assert from "node:assert/strict";
import {modelMessages} from "../lib/model-messages";
import {modelIdentityReply} from "../lib/pip-chat";
test("the latest request follows separate historical user and assistant turns",()=>{
 const turns=modelMessages("Reply in JSON",{latestMessage:"Explain a foreign key"},[{role:"user",content:"hello"},{role:"assistant",content:"Hi, how can I help?"}]);
 assert.deepEqual(turns.map(turn=>turn.role),["system","user","assistant","user"]);
 assert.equal(turns[1].content,"hello");assert.equal(turns[2].content,"Hi, how can I help?");
 assert.ok(turns.at(-1)!.content.endsWith("Current student message — answer this, not an earlier turn:\nExplain a foreign key"));
});
test("model identity comes from configuration, without swallowing unrelated questions",()=>{
 assert.equal(modelIdentityReply("what model are you?","nvidia/test-model"),"I'm Pip, running on nvidia/test-model through Nebius Token Factory.");
 assert.ok(modelIdentityReply("what model are you man","nvidia/test-model")?.includes("nvidia/test-model"));
 assert.ok(modelIdentityReply("Which AI model are you using?",null)?.includes("isn't connected"));
 assert.equal(modelIdentityReply("What model are you recommending for my project?","test"),undefined);
 assert.equal(modelIdentityReply("What is a database model?","test"),undefined);
});

test("latest message is sent once without mutating supporting context",()=>{const data={latestMessage:"UNIQUE_CURRENT_REQUEST",workspace:{subject:"SQL"}};const current=modelMessages("Task",data).at(-1)!.content;assert.equal(current.split("UNIQUE_CURRENT_REQUEST").length-1,1);assert.match(current,/SQL/);assert.equal(data.latestMessage,"UNIQUE_CURRENT_REQUEST");});
