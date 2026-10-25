export function structuredTaskOptions(disableThinking: string | undefined) {
  return disableThinking === "true"
    ? { chat_template_kwargs: { enable_thinking: false } }
    : {};
}
