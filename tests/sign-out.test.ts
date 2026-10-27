import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SignOut from "../components/sign-out";
test("signed-in screens expose a named logout button; guest screens do not", () => {
  assert.match(renderToStaticMarkup(createElement(SignOut, { signedIn: true })), />Sign out<\/button>/);
  assert.equal(renderToStaticMarkup(createElement(SignOut, { signedIn: false })), "");
});
