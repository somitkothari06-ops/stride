import test from "node:test";
import assert from "node:assert/strict";
import {
  structuredTaskOptions,
  providerConfigId,
} from "../lib/provider-config";

test("short structured tasks can explicitly disable reasoning", () => {
  assert.deepEqual(structuredTaskOptions("true"), {
    chat_template_kwargs: { enable_thinking: false },
  });
});
test("provider-specific reasoning control is omitted unless explicitly configured", () => {
  assert.deepEqual(structuredTaskOptions(undefined), {});
  assert.deepEqual(structuredTaskOptions("false"), {});
});
test("verification cannot carry over to a replacement key or different model", () => {
  const base = {
    key: "test-key-a",
    model: "test-model",
    baseUrl: "https://example.invalid/v1",
    disableThinking: "true",
  };
  const original = providerConfigId(base);
  assert.equal(original, providerConfigId({ ...base }));
  assert.notEqual(original, providerConfigId({ ...base, key: "test-key-b" }));
  assert.notEqual(
    original,
    providerConfigId({ ...base, model: "other-model" }),
  );
  assert.notEqual(
    original,
    providerConfigId({ ...base, disableThinking: "false" }),
  );
  assert.ok(!original.includes(base.key));
});
