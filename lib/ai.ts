import { z } from "zod";
import { modelMessages, type ConversationTurn } from "./model-messages";
import type { RoleSource } from "./types";
import {
  consumeAllowance,
  getProviderCheck,
  recordProviderCheck,
} from "./store";
import { providerConfigId, structuredTaskOptions } from "./provider-config";

function currentConfigId(selectedModel = process.env.NEBIUS_MODEL_FAST) {
  if (!process.env.NEBIUS_API_KEY || !selectedModel)
    return null;
  return providerConfigId({
    key: process.env.NEBIUS_API_KEY,
    model: selectedModel,
    baseUrl:
      process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1",
    disableThinking: process.env.NEBIUS_DISABLE_THINKING,
  });
}

export function providerStatus() {
  const configId = currentConfigId();
  const check = configId ? getProviderCheck(configId) : null;
  return {
    nebius: Boolean(
      process.env.NEBIUS_API_KEY && process.env.NEBIUS_MODEL_FAST,
    ),
    tavily: Boolean(process.env.TAVILY_API_KEY),
    vision: Boolean(process.env.NEBIUS_API_KEY && process.env.NEBIUS_MODEL_VISION),
    visionModel: process.env.NEBIUS_MODEL_VISION || null,
    model: process.env.NEBIUS_MODEL_FAST || null,
    nebiusVerifiedAt: check?.verified_at || null,
    nebiusLastFailureAt: check?.last_failure_at || null,
  };
}
export async function model<T>(
  session: string,
  task: string,
  data: unknown,
  schema: z.ZodType<T>,
  options: { maxTokens?: number; history?: ConversationTurn[]; images?: string[] } = {},
): Promise<T> {
  if (!providerStatus().nebius) throw new Error("MODEL_UNAVAILABLE");
  const selectedModel=options.images?.length?process.env.NEBIUS_MODEL_VISION:process.env.NEBIUS_MODEL_FAST;
  if(!selectedModel)throw new Error("VISION_NOT_CONFIGURED");
  if(options.images&&(options.images.length>5||options.images.some(image=>!/^data:image\/(png|jpeg|webp);base64,/.test(image)||image.length>5000000)))throw new Error("INVALID_REQUEST");
  consumeAllowance(session);
  const configId = currentConfigId(selectedModel)!;
  const messages=modelMessages(task,data,options.history);
  const requestMessages=options.images?.length?messages.map((message,index)=>index===messages.length-1?{...message,content:[{type:"text",text:message.content},...options.images!.map(url=>({type:"image_url",image_url:{url}}))]}:message):messages;
  let transportSucceeded=false;
  try {
    const response = await fetch(
      `${(process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1").replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        signal: AbortSignal.timeout(options.images?.length?60000:25000),
        headers: {
          Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          temperature: 0.2,
          max_tokens: Math.min(4000, Math.max(512, options.maxTokens || 1800)),
          response_format: { type: "json_object" },
          ...structuredTaskOptions(process.env.NEBIUS_DISABLE_THINKING),
          messages: requestMessages,
        }),
      },
    );
    if (!response.ok) {
      console.warn("Stride inference rejected", { status: response.status });
      throw new Error("MODEL_UNAVAILABLE");
    }
    transportSucceeded=true;
    const result = await response.json();
    if (result.choices?.[0]?.finish_reason === "length") {
      console.warn("Stride inference truncated", {
        completionTokens: result.usage?.completion_tokens,
      });
      throw new Error("MODEL_UNAVAILABLE");
    }
    const raw = result.choices?.[0]?.message?.content;
    if (typeof raw !== "string") throw new Error("MODEL_UNAVAILABLE");
    const validated = schema.safeParse(
      JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")),
    );
    if (!validated.success) {
      console.warn("Stride inference schema mismatch", {
        issues: validated.error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
        })),
      });
      throw new Error("MODEL_UNAVAILABLE");
    }
    recordProviderCheck(configId, true);
    return validated.data;
  } catch {
    if(!transportSucceeded)recordProviderCheck(configId, false);
    throw new Error("MODEL_UNAVAILABLE");
  }
}

export async function searchRoles(session: string, role: string): Promise<RoleSource[]> {
  return searchWeb(session, `${role} internship India university students requirements`);
}
export async function searchWeb(session: string, query: string): Promise<RoleSource[]> {
  if (!process.env.TAVILY_API_KEY) throw new Error("SEARCH_NOT_CONFIGURED");
  consumeAllowance(session);
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      signal: AbortSignal.timeout(18000),
      headers: {
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query.slice(0, 300),
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
      }),
    });
    if (!response.ok) throw new Error("SEARCH_UNAVAILABLE");
    const result = await response.json();
    const seen = new Set<string>();
    return (result.results || []).flatMap(
      (r: { url: string; title: string; content: string }) => {
        try {
          const u = new URL(r.url);
          if (!/^https?:$/.test(u.protocol) || seen.has(u.href)) return [];
          seen.add(u.href);
          return [
            {
              url: u.href,
              title: String(r.title).slice(0, 200),
              excerpt: String(r.content || "").slice(0, 1800),
              retrievedAt: new Date().toISOString(),
            },
          ];
        } catch {
          return [];
        }
      },
    );
  } catch {
    throw new Error("SEARCH_UNAVAILABLE");
  }
}
