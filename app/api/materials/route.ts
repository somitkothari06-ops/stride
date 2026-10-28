import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { NextResponse } from "next/server";
import { body, checkOrigin, failure, requireSession } from "@/lib/http";
import { mutate } from "@/lib/store";
import {clientBucket} from "@/lib/client-limits";
import { acquireUpload } from "@/lib/upload-guard";
import { retainPdf,removePdf } from "@/lib/document-files";
import { MaterialSchema } from "@/lib/course-types";
import { checkCourseDraft, sealCourseDraft } from "@/lib/course-draft";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let directory: string | undefined;
  let release: (()=>void)|undefined;
  try {
    checkOrigin(request);
    const { id } = await requireSession();
    const limit = 8 * 1024 * 1024 + 32768;
    if (Number(request.headers.get("content-length") || 0) > limit) throw new Error("INPUT_TOO_LARGE");
    release=acquireUpload(id,Date.now(),clientBucket(request));
    const reader = request.body?.getReader();
    if (!reader) throw new Error("INVALID_REQUEST");
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > limit) { await reader.cancel(); throw new Error("INPUT_TOO_LARGE"); }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    const data = await new Response(new Uint8Array(Buffer.concat(chunks)).buffer, { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    const file = data.get("file");
    if (!(file instanceof File) || file.size > 8 * 1024 * 1024) throw new Error("INPUT_TOO_LARGE");
    const extension = extname(file.name).toLowerCase();
    if (![".pdf", ".pptx", ".docx", ".txt", ".md"].includes(extension)) throw new Error("DOCUMENT_UNREADABLE");
    directory = await mkdtemp(join(tmpdir(), "stride-course-"));
    const path = join(directory, `source${extension}`);
    await writeFile(path, Buffer.from(await file.arrayBuffer()), { mode: 0o600 });
    let output;
    try {
      output = await promisify(execFile)(process.execPath, ["--max-old-space-size=384", join(process.cwd(), "scripts/extract-course.mjs"), path, extension], { timeout: 90000, maxBuffer: 2500000, env: { PATH: process.env.PATH, NODE_ENV: "production" } });
    } catch { throw new Error("DOCUMENT_UNREADABLE"); }
    const extracted = JSON.parse(output.stdout);
    const candidate = MaterialSchema.parse({
      title: file.name.replace(/\.[^.]+$/, "").slice(0, 160),
      subject: data.get("subject"), kind: data.get("kind"),
      filename: file.name.replace(/^.*[\\/]/, "").slice(0, 160), ...extracted,
      ...(extension === ".pdf" ? {storageKey:await retainPdf(path)} : {}),
    });
    return NextResponse.json({ candidate, ...sealCourseDraft(id, candidate) });
  } catch (error) { return failure(error); }
  finally { release?.(); if (directory) await rm(directory, { recursive: true, force: true }); }
}

export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const { id } = await requireSession();
    const input = await body(request, 2500000);
    const candidate = MaterialSchema.parse(input.candidate);
    checkCourseDraft(id, candidate, input.proof, input.expiresAt);
    const materialId = createHash("sha256").update(input.proof).digest("hex");
    const state = mutate(id, (current) => {
      if (current.materials?.some((m) => m.id === materialId)) return;
      if ((current.materials?.length || 0) >= 12) throw new Error("LIBRARY_FULL");
      current.materials = [...(current.materials || []), { ...candidate, id: materialId, addedAt: new Date().toISOString() }];
      current.revision++;
      current.prepared = null;
    });
    return NextResponse.json({ state });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const { id, state: before } = await requireSession();
    const input = await body(request);
    if (typeof input.id !== "string") throw new Error("INVALID_REQUEST");
    const removedKey=before.materials?.find(m=>m.id===input.id)?.storageKey;
    const state = mutate(id, (current) => {
      if (!current.materials?.some((m) => m.id === input.id)) throw new Error("NOT_FOUND");
      current.materials = current.materials.filter((m) => m.id !== input.id);
      current.revision++;
      current.prepared = null;
    });
    if(removedKey) await removePdf(removedKey).catch(()=>{});
    return NextResponse.json({ state });
  } catch (error) { return failure(error); }
}
