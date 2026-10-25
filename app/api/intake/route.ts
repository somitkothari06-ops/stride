import { NextResponse } from "next/server";
import { z } from "zod";
import { body, checkOrigin, failure, requireSession } from "@/lib/http";
import { guidedIntake } from "@/lib/planner";
import { IntakeSchema } from "@/lib/types";
import { model, providerStatus } from "@/lib/ai";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { id } = await requireSession();
    const input = z
      .object({ source: z.string().min(10).max(12000) })
      .parse(await body(request));
    if (!providerStatus().nebius)
      return NextResponse.json({
        candidate: guidedIntake(input.source),
        mode: "guided",
      });
    const candidate = await model(
      id,
      "Extract one work item. Return JSON with title string, subject string, kind string, dueDate string or null, summary string and uncertainty string. Always include every field; use an empty string for uncertainty if none. kind is assignment|exam|project|revision. dueDate is YYYY-MM-DD or null. Relative dates without an original message date must be null. Ask about unclear fields in uncertainty. Student confirmation is required.",
      input,
      IntakeSchema,
    );
    return NextResponse.json({ candidate, mode: "live" });
  } catch (error) {
    return failure(error);
  }
}
