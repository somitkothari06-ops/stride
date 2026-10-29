import { NextResponse } from "next/server";
import { z } from "zod";
import { body, checkOrigin, failure, requireSession } from "@/lib/http";
import { intakeReview } from "@/lib/intake-review";
import { guidedIntake } from "@/lib/planner";
import { IntakeSchema } from "@/lib/types";
import { model, providerStatus } from "@/lib/ai";
import {calendarContext,groundDeadline,validDate} from "@/lib/calendar";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { id,state } = await requireSession();
    const input = z
      .object({ source: z.string().min(10).max(12000), sourceType:z.string().max(80).optional(),messageDate:z.string().refine(validDate).optional() })
      .parse(await body(request));
    const clock=calendarContext(state.profile.timezone),current=["My own words","Voice capture"].includes(input.sourceType||"");
    const reference={...clock,currentToday:clock.today,today:input.messageDate||(current?clock.today:undefined)};
    if (!providerStatus().nebius)
      return NextResponse.json({
        candidate: groundDeadline(guidedIntake(input.source),input.source,reference),
        mode: "guided",
      });
    const result = await intakeReview(input.source,()=>model(
      id,
      "Extract one work item. Return JSON with title string, subject string, kind string, dueDate string or null, summary string and uncertainty string. title max 160 characters; subject a short subject name, max 80 characters; summary max 1000 characters; uncertainty max 500 characters. Always include every field; use an empty string for uncertainty if none. kind is assignment|exam|project|revision. dueDate is YYYY-MM-DD or null. Relative dates without an original message date must be null. Ask about unclear fields in uncertainty. Student confirmation is required.",
      {...input,calendar:{...clock,referenceDate:reference.today||null},dateRule:"Current personal input uses today in the supplied timezone. Copied text needs its original message date. Never use a training-data date."},
      IntakeSchema,{maxTokens:800,timeoutMs:10000},
    ));
    return NextResponse.json({ candidate:groundDeadline(result.candidate,input.source,reference), mode: result.mode });
  } catch (error) {
    return failure(error);
  }
}
