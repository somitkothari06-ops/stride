import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getState, sessionId } from "./store";

export async function requireSession() {
  const token = (await cookies()).get("stride_session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new Error("SESSION_EXPIRED");
  const id = sessionId(token);
  const state = getState(id);
  if (!state) throw new Error("SESSION_EXPIRED");
  return { id, state };
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && new URL(origin).host !== host) throw new Error("FORBIDDEN");
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 30000)
    throw new Error("INPUT_TOO_LARGE");
  const text = await request.text();
  if (text.length > 30000) throw new Error("INPUT_TOO_LARGE");
  return JSON.parse(text);
}
export function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const known: Record<string, [number, string]> = {
    SESSION_EXPIRED: [
      401,
      "Your session expired. Reload to start a private workspace.",
    ],
    FORBIDDEN: [403, "This request is not allowed."],
    NOT_FOUND: [404, "That item is no longer in this workspace."],
    STALE_CONTEXT: [
      409,
      "Your work changed during preparation. Please try again with the latest context.",
    ],
    INPUT_TOO_LARGE: [413, "Use a shorter excerpt (up to 12,000 characters)."],
    DAILY_LIMIT: [
      429,
      "Today's live-call allowance has been reached. Local guidance is still available.",
    ],
    SEARCH_NOT_CONFIGURED: [
      503,
      "Tavily is not configured. Add a server-side key to search live role sources.",
    ],
    SEARCH_UNAVAILABLE: [
      502,
      "Search could not refresh. Your existing sources and work are safe.",
    ],
    MODEL_UNAVAILABLE: [
      502,
      "The model could not complete this request. Your work is safe; try again shortly.",
    ],
  };
  const [status, message] = known[code] || [
    400,
    "Check your input and try again. Your saved work is unchanged.",
  ];
  return NextResponse.json(
    { error: { code: known[code] ? code : "INVALID_REQUEST", message } },
    { status },
  );
}
