import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { guestWorkspace, ownedWorkspace } from "./account-store";
import { currentAccount } from "./auth";

export async function requireSession() {
  const account = await currentAccount();
  if (account) return { ...ownedWorkspace(account.id), account };
  const token = (await cookies()).get("stride_session")?.value;
  const guest = guestWorkspace(token);
  if (!guest) throw new Error("SESSION_EXPIRED");
  return { ...guest, account: null };
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
    CHAT_STALE: [409,"This conversation changed in another tab. Reload it and send your message again; your draft is still here."],
    CAPTURE_EXPIRED: [400,"This capture review expired or belongs to another workspace. Review your words again."],
    CAPTURE_STALE: [409,"Your workspace changed. Review your words again before saving; nothing was added."],
    CAPTURE_EVIDENCE_INVALID: [400,"A suggestion couldn't be traced to your words. Review again or edit your capture."],
    CAPTURE_PROFILE_FULL: [400,"That addition doesn't fit this personal-context field. Shorten it or edit it in About You; nothing was added."],
    CAPTURE_LIMIT: [429,"You have several pending reviews. Finish one or wait 15 minutes before creating another."],
    AUTH_EXPIRED: [401, "Sign in again to open your saved workspace. Your work is safe."],
    OAUTH_NOT_CONFIGURED: [503, "This sign-in provider still needs its one-time setup. Use email or guest mode for now."],
    AUTH_NOT_CONFIGURED: [503, "Account login is not connected yet. Guest mode is available."],
    AUTH_FAILED: [401, "Couldn't sign in. Check your email and password, and confirm your email first."],
    AUTH_SIGNUP_FAILED: [400, "Couldn't create this account. Signup email is currently limited to project testers. Use guest mode, or sign in if you already have an account."],
    AUTH_RATE_LIMIT: [429, "Too many account requests. Wait 15 minutes before trying again."],
    AUTH_UNAVAILABLE: [503, "Account services couldn't respond. Please try again shortly."],
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
      "Today's AI allowance is used up. You can still review and organise your saved work.",
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
