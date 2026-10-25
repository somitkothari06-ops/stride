import { createHash } from "node:crypto";

export function providerConfigId(config: {
  key: string;
  model: string;
  baseUrl: string;
  disableThinking?: string;
}) {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}

export function structuredTaskOptions(disableThinking: string | undefined) {
  return disableThinking === "true"
    ? { chat_template_kwargs: { enable_thinking: false } }
    : {};
}
