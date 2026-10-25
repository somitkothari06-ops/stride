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
export async function body(request: Request, limit = 30000) {
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new Error("INPUT_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_REQUEST");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > limit) { await reader.cancel(); throw new Error("INPUT_TOO_LARGE"); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const text = new TextDecoder().decode(Buffer.concat(chunks));
  return JSON.parse(text);
}
export function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const known: Record<string, [number, string]> = {
    COURSE_REVIEW_INVALID: [400, "This document review expired or changed. Extract the file again before confirming it (reviews last 15 minutes and expire on a server restart)."],
    COURSE_CONTEXT_NEEDED: [400, "Add and confirm a course document for this subject before comparing it."],
    DOCUMENT_UNREADABLE: [422, "Couldn't read this document. Use an unlocked text PDF, PPTX, DOCX, TXT or MD file under 8 MB and 100 pages/slides. Scans need OCR or a pasted transcription."],
    LIBRARY_FULL: [400, "Your library holds 12 documents. Remove an older document before adding another."],
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
