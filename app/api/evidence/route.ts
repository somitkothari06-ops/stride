import { invalidateRoleBridge } from "@/lib/role-bridge";
import {removeBuildEvidence} from "@/lib/student-build";
import { NextResponse } from "next/server";
import { body, checkOrigin, failure, requireSession } from "@/lib/http";
import { clientBucket } from "@/lib/client-limits";
import { acquireUpload } from "@/lib/upload-guard";
import { mutate } from "@/lib/store";
import { model } from "@/lib/ai";
import {
  MAX_ATTACHMENTS,
  MAX_SUBMISSION_CHARS,
  EvidenceCandidateSchema,
  assertCombinedTextLimit,
  checkGrounding,
  createEvidenceReview,
  commitEvidence,
  evidenceModelData,
  evidenceTask,
  evidenceTextExcerpt,
  prepareAttachment,
  validActivityDate,
} from "@/lib/evidence";
import { readEvidence, removeEvidence, retainEvidence } from "@/lib/evidence-files";
import { clearReturnCardIfStale } from "@/lib/focus-session";

export const runtime = "nodejs";
export const maxDuration = 120;

// Five 3 MB images plus the largest text attachment and multipart overhead
// stay under the 16 MB reverse-proxy request limit.
const MAX_TOTAL_BYTES = MAX_ATTACHMENTS * 3_000_000 + 262144 + 65536;

// Upload + extract: files are stored privately first, then the NVIDIA text or
// vision path proposes a record. Nothing touches the workspace here — the
// student reviews the proposal before anything is saved.
export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    checkOrigin(request);
    const { id, state } = await requireSession();
    const limit = MAX_TOTAL_BYTES;
    if (Number(request.headers.get("content-length") || 0) > limit)
      throw new Error("INPUT_TOO_LARGE");
    release = acquireUpload(id, Date.now(), clientBucket(request));
    const reader = request.body?.getReader();
    if (!reader) throw new Error("INVALID_REQUEST");
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > limit) {
          await reader.cancel();
          throw new Error("INPUT_TOO_LARGE");
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    const data = await new Response(
      new Uint8Array(Buffer.concat(chunks)).buffer,
      { headers: { "Content-Type": request.headers.get("content-type") || "" } },
    ).formData();
    const text = String(data.get("text") || "");
    if (!text.trim() || text.length > MAX_SUBMISSION_CHARS)
      throw new Error("INPUT_TOO_LARGE");
    const activityDate = validActivityDate(data.get("activityDate") || null);
    const files = data.getAll("files").filter((item): item is File => item instanceof File);
    // The shared vision model takes at most five images, and this cap keeps the
    // whole request under the 16 MB proxy limit; per-file size bounds are
    // unchanged and the error is explicit rather than a silent drop.
    if (files.length > MAX_ATTACHMENTS) throw new Error("EVIDENCE_ATTACHMENT_LIMIT");
    const stored: ReturnType<typeof prepareAttachment>[] = [];
    try {
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const attachment = prepareAttachment(file.name, bytes);
        await retainEvidence(attachment.key, attachment.extension, bytes);
        stored.push(attachment);
      }
      const excerpts = [];
      const images = [];
      const modelAttachments:Parameters<typeof evidenceModelData>[1]=[];
      for (const attachment of stored) {
        const bytes = await readEvidence(attachment.key, attachment.extension);
        if (attachment.kind === "text") {
          // Full valid UTF-8 text, never silently clipped; the combined bound
          // below is enforced explicitly instead.
          excerpts.push({
            filename: attachment.filename,
            kind: attachment.kind,
            excerpt: evidenceTextExcerpt(bytes),
          });
          modelAttachments.push(excerpts[excerpts.length-1]);
        } else {
          modelAttachments.push({filename:attachment.filename,kind:attachment.kind});
          images.push(
            `data:${attachment.mime};base64,${Buffer.from(bytes).toString("base64")}`,
          );
        }
      }
      assertCombinedTextLimit(
        text,
        excerpts.map((excerpt) => excerpt.excerpt),
      );
      let mode:"model"|"unassessed"="model";
      let candidate;
      try{
        candidate = await model(id,evidenceTask,evidenceModelData(text,modelAttachments),EvidenceCandidateSchema,{maxTokens:3000,...(images.length?{images}:{})});
        checkGrounding(candidate);
      }catch(error){
        if(!(error instanceof Error)||!["MODEL_UNAVAILABLE","VISION_NOT_CONFIGURED","DAILY_LIMIT","EVIDENCE_CLAIM_INVALID"].includes(error.message))throw error;
        console.warn("Stride journal review unavailable",{code:error.message});
        mode="unassessed";
        candidate={activity:text.trim().split("\n")[0].slice(0,300),studentExplanation:text.trim(),artifactShows:`Student submitted an explanation${stored.length?` and ${stored.length} attachment(s)`:""}. Not assessed.`,modelFeedback:"",uncertainty:"Model review was unavailable. This is an unassessed record of your submission.",nextSuggestion:""};
      }
      candidate.studentExplanation=text.trim();
      const review = createEvidenceReview(id, state.revision, {
        candidate,
        mode,
        originalText: text,
        attachments: stored,
      });
      return NextResponse.json({
        mode,
        reviewId: review.id,
        expiresAt: review.expiresAt,
        candidate,
        activityDate,
        attachments: stored.map(({ key, filename, kind, mime, size, uploadedAt }) => ({
          key,
          filename,
          kind,
          mime,
          size,
          uploadedAt,
        })),
      });
    } catch (error) {
      // A rejected submission must not leave orphaned files behind.
      for (const attachment of stored)
        await removeEvidence(attachment.key, attachment.extension).catch(() => {});
      throw error;
    }
  } catch (error) {
    return failure(error);
  } finally {
    release?.();
  }
}

// Confirm: the reviewed proposal becomes a journal entry. Replay-safe.
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const { id } = await requireSession();
    const input = await body(request, 60000);
    const candidate = EvidenceCandidateSchema.parse(input.candidate);
    const state = await commitEvidence(
      id,
      String(input.reviewId || ""),
      candidate,
      input.activityDate,
    );
    return NextResponse.json({ state, entryId:state.evidence?.entries.find(entry=>entry.captureId===String(input.reviewId||""))?.id });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  let removed: { key: string; extension: string }[] = [];
  try {
    checkOrigin(request);
    const { id, state: before } = await requireSession();
    const input = await body(request);
    if (typeof input.id !== "string") throw new Error("INVALID_REQUEST");
    const entry = (before.evidence?.entries || []).find((item) => item.id === input.id);
    if (!entry) throw new Error("NOT_FOUND");
    removed = entry.observed.attachments.map(({ key, extension }) => ({ key, extension }));
    const state = mutate(id, (current) => {
      if (!(current.evidence?.entries || []).some((item) => item.id === input.id))
        throw new Error("NOT_FOUND");
      removeBuildEvidence(current,input.id);
      current.evidence = {
        entries: (current.evidence?.entries || []).filter((item) => item.id !== input.id),
      };
      current.revision++;
      invalidateRoleBridge(current);
      // A saved continuation derived from the deleted entry must not survive it.
      clearReturnCardIfStale(current);
    });
    for (const attachment of removed)
      await removeEvidence(attachment.key, attachment.extension).catch(() => {});
    return NextResponse.json({ state });
  } catch (error) {
    return failure(error);
  }
}

// Export returns the journal entries with attachment metadata, never bytes.
export async function GET() {
  try {
    const { state } = await requireSession();
    return NextResponse.json(
      { entries: state.evidence?.entries || [] },
      {
        headers: {
          "Content-Disposition": 'attachment; filename="stride-evidence-journal.json"',
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return failure(error);
  }
}
