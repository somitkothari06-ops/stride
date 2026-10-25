// Never prints credentials. Listing models does not run inference.
const key = process.env.NEBIUS_API_KEY;
if (!key) {
  console.error("NEBIUS_API_KEY is missing. Add it privately to .env.local.");
  process.exit(1);
}
const base = (
  process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1"
).replace(/\/$/, "");
try {
  const response = await fetch(base + "/models", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`Model catalog returned HTTP ${response.status}`);
  const data = await response.json();
  const models = (data.data || []).filter((m) => /^nvidia\//i.test(m.id));
  console.log("Account-visible NVIDIA models:");
  models.forEach((m) => console.log("  " + m.id));
  if (process.argv.includes("--test")) {
    const selected = process.env.NEBIUS_MODEL_FAST;
    if (!models.some((m) => m.id === selected))
      throw new Error(
        "NEBIUS_MODEL_FAST must match an available NVIDIA model ID.",
      );
    const test = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: selected,
        max_tokens: 256,
        response_format: { type: "json_object" },
        ...(process.env.NEBIUS_DISABLE_THINKING === "true"
          ? { chat_template_kwargs: { enable_thinking: false } }
          : {}),
        messages: [
          {
            role: "user",
            content: 'Return only this JSON object: {"ok":true}',
          },
        ],
      }),
    });
    if (!test.ok) throw new Error(`Inference returned HTTP ${test.status}`);
    const output = await test.json();
    if (output.choices?.[0]?.finish_reason === "length")
      throw new Error(
        "Output limit reached before the structured response completed. Check the model's reasoning settings.",
      );
    const parsed = JSON.parse(output.choices?.[0]?.message?.content || "{}");
    if (parsed.ok !== true)
      throw new Error(
        "The model did not return the expected structured result.",
      );
    console.log("PASS: one small live structured-output call.");
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : "Provider check failed.");
  process.exit(1);
}
