import { NextResponse } from "next/server";
import { z } from "zod";
import { body, checkOrigin, failure, requireSession } from "@/lib/http";
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
    const candidate = await model(
      id,
      "Extract one work item. Return JSON with title string, subject string, kind string, dueDate string or null, summary string and uncertainty string. Always include every field; use an empty string for uncertainty if none. kind is assignment|exam|project|revision. dueDate is YYYY-MM-DD or null. Relative dates without an original message date must be null. Ask about unclear fields in uncertainty. Student confirmation is required.",
      {...input,calendar:{...clock,referenceDate:reference.today||null},dateRule:"Current personal input uses today in the supplied timezone. Copied text needs its original message date. Never use a training-data date."},
      IntakeSchema,
    );
    return NextResponse.json({ candidate:groundDeadline(candidate,input.source,reference), mode: "live" });
  } catch (error) {
    return failure(error);
  }
}
