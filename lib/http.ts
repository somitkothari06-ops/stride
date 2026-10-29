import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { guestWorkspace, ownedWorkspace } from "./account-store";
import { currentAccount } from "./auth";
import { mutationOrigin } from "./auth-origin";

export async function requireSession() {
  const jar=await cookies();
  if(jar.get("stride_demo_mode")?.value==="1"){
    const demo=guestWorkspace(jar.get("stride_demo_session")?.value);
    if(!demo?.state.demo)throw new Error("DEMO_EXPIRED");
    return {...demo,account:null};
  }
  const account = await currentAccount();
  if (account) return { ...ownedWorkspace(account.id), account };
  const token = (await cookies()).get("stride_session")?.value;
  const guest = guestWorkspace(token);
  if (!guest) throw new Error("SESSION_EXPIRED");
  return { ...guest, account: null };
}
export function checkOrigin(request: Request) {
  mutationOrigin(request);
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
    DEMO_EXPIRED:[401,"This demo session expired. Open the demo page to start a fresh copy."],
    BUILD_STALE:[409,"Your build changed in another tab. Reload it; your draft is still here."],
    BUILD_EXISTS:[409,"You already have a build. Continue it or remove it before starting another."],
    BUILD_NOT_FOUND:[404,"This build is no longer available. Reload to start another."],
    BUILD_PAUSED:[409,"Your build is paused. Resume whenever you’re ready."],
    BUILD_ADVANCE:[409,"Your attempt is saved. Choose your next step before adding another."],
    BUILD_FULL:[409,"This build has 50 saved attempts. Export it before starting another."],
    BUILD_EVIDENCE_MISSING:[409,"That journal entry is no longer available. Choose another; your draft is still here."],
    BUILD_SOURCE_INVALID:[502,"That feedback could not be linked to your saved work. Try again; your draft is still here."],
    CLIENT_RATE_LIMIT:[429,"Too many requests from this connection. Wait a little and try again. Saved work is unchanged."],
    UPLOAD_BUSY:[429,"A few files are being processed. Try again in a moment."],
    UPLOAD_RATE_LIMIT:[429,"You’ve tried several uploads. Wait ten minutes before adding more."],
    VISION_NOT_CONFIGURED: [503,"Diagram reading isn’t connected. Choose text-only or connect a vision model."],
    DOCUMENT_RENDER_FAILED: [503,"Couldn’t render these pages. Your PDF is safe; try one page at a time."],
    STUDY_NO_TEXT: [422,"These pages have too little readable text. Choose another range or add a transcription."],
    STUDY_RANGE_TOO_LARGE: [400,"This section has a lot of text. Choose fewer pages at a time."],
    STUDY_EVIDENCE_INVALID: [502,"The lesson couldn’t be traced to your pages. Try preparing it again."],
    STUDY_EXPIRED: [409,"This lesson session expired. Prepare the section again; your answer is still here."],
    STUDY_BUSY: [429,"Several lessons are being prepared. Try again shortly."],
    STUDY_LIMIT: [429,"This lesson has reached its feedback limit. Continue with another section."],
    SETTINGS_STALE: [409,"One of these settings changed in another tab. Reload settings, then choose again."],
    CHAT_NOT_FOUND: [404,"This chat was deleted or is unavailable. Open another chat; your draft is still here."],
    CHAT_THREAD_LIMIT: [409,"You have 50 chats. Delete a chat you no longer need before starting another."],
    CHAT_FULL: [409,"This chat has reached 100 exchanges. Start a new chat to continue; this one stays saved."],
    CHAT_STALE: [409,"This conversation changed in another tab. Reload it and send your message again; your draft is still here."],
    CAPTURE_EXPIRED: [400,"This capture review expired or belongs to another workspace. Review your words again."],
    CAPTURE_STALE: [409,"Your workspace changed. Review your words again before saving; nothing was added."],
    CAPTURE_EVIDENCE_INVALID: [400,"A suggestion couldn't be traced to your words. Review again or edit your capture."],
    CAPTURE_PROFILE_FULL: [400,"That addition doesn't fit this personal-context field. Shorten it or edit it in About You; nothing was added."],
    CAPTURE_LIMIT: [429,"You have several pending reviews. Finish one or wait 15 minutes before creating another."],
    EVIDENCE_UNSUPPORTED: [422,"That file type isn’t allowed here. Use TXT, MD, PNG, JPEG or WebP files; SVG, documents and programs are never accepted."],
    EVIDENCE_TOO_LARGE: [413,"That file is too large for the journal. Text files up to 256 KB and images up to 3 MB work here."],
    EVIDENCE_MISMATCH: [400,"This file’s contents don’t match its name. Re-export it with the right format, then try again."],
    EVIDENCE_LIMIT: [429,"The journal or the pending reviews are full. Save or remove one before adding another."],
    EVIDENCE_ATTACHMENT_LIMIT: [413,"Up to 5 files fit in one journal entry. Keep each file within its own size limit and split larger work across entries; nothing was added."],
    EVIDENCE_TEXT_TOO_LONG: [413,"Your submission and text attachments together are over the 24,000-character limit for one entry. Shorten the submission or remove an attachment; your files are still here."],
    EVIDENCE_TAMPERED: [400,"The model’s observations were changed before saving. Only your own activity and explanation can be edited — review the original proposal again, then save."],
    EVIDENCE_REVIEW_INVALID: [400,"This journal review expired or belongs to another workspace. Submit your work again; your files are still here."],
    EVIDENCE_STALE: [409,"Your workspace changed while you reviewed. Check the preview again, then save; nothing was added."],
    EVIDENCE_CLAIM_INVALID: [502,"The suggestion made a claim it can’t know. Try again; your submission is unchanged."],
    EVIDENCE_ATTACHMENT_MISSING: [400,"An attached file is no longer available. Remove it from this entry or upload it again."],
    EVIDENCE_INVALID_DATE: [400,"That activity date isn’t valid. Choose a real date or leave it empty."],
    FOCUS_ACTIVE: [409,"A focused session is already open. Close it or keep going from the Journal."],
    FOCUS_NOT_FOUND: [404,"This focused session has already closed. Start a new one whenever you’re ready."],
    AUTH_EXPIRED: [401, "Sign in again to open your saved workspace. Your work is safe."],
    OAUTH_NOT_CONFIGURED: [503, "This sign-in provider still needs its one-time setup. Use email or guest mode for now."],
    AUTH_NOT_CONFIGURED: [503, "Account login is not connected yet. Guest mode is available."],
    AUTH_FAILED: [401, "Couldn't sign in. Check your email and password, and confirm your email first."],
    AUTH_SIGNUP_FAILED: [400, "Couldn't create this account. Signup email is currently limited to project testers. Use guest mode, or sign in if you already have an account."],
    AUTH_RATE_LIMIT: [429, "Too many account requests. Wait 15 minutes before trying again."],
    AUTH_UNAVAILABLE: [503, "Account services couldn't respond. Please try again shortly."],
    COURSE_REVIEW_INVALID: [400, "This document review expired or changed. Extract the file again before confirming it (reviews last 15 minutes and expire on a server restart)."],
    COURSE_REFERENCE_EXPIRED: [400, "These course results expired. Find courses again; your notes are safe."],
    COURSE_CONTEXT_NEEDED: [400, "Add and confirm a course document for this subject before comparing it."],
    DOCUMENT_UNREADABLE: [422, "Couldn't read this document. Use an unlocked text PDF, PPTX, DOCX, TXT or MD file under 8 MB and 500 PDF pages (100 slides). Scans need OCR or a pasted transcription."],
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
