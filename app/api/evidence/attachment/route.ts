import { NextResponse } from "next/server";
import { failure, requireSession } from "@/lib/http";
import { attachmentAccess } from "@/lib/evidence";
import { readEvidence } from "@/lib/evidence-files";

export const runtime = "nodejs";

// Attachments are private. A file is served only when the requesting
// workspace's saved entries or its own pending review references it, so one
// student can never open another student's upload by guessing the key.
export async function GET(request: Request) {
  try {
    const { id } = await requireSession();
    const key = new URL(request.url).searchParams.get("key") || "";
    const access = /^[0-9a-f-]{36}$/.test(key) ? attachmentAccess(id, key) : null;
    if (!access) throw new Error("NOT_FOUND");
    const bytes = await readEvidence(key, access.extension);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": access.mime,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
