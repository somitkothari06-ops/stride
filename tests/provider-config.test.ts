import test from "node:test";
import assert from "node:assert/strict";
import { structuredTaskOptions } from "../lib/provider-config";

test("short structured tasks can explicitly disable reasoning", () => {
  assert.deepEqual(structuredTaskOptions("true"), {
    chat_template_kwargs: { enable_thinking: false },
  });
});
test("provider-specific reasoning control is omitted unless explicitly configured", () => {
  assert.deepEqual(structuredTaskOptions(undefined), {});
  assert.deepEqual(structuredTaskOptions("false"), {});
});
