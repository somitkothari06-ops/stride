import { NextResponse } from "next/server";
import { body, checkOrigin, failure, requireSession } from "@/lib/http";
import { mutate } from "@/lib/store";
import {
  changeReturn,
  closeFocus,
  continueReturn,
  pauseFocus,
  resumeFocus,
  returnCard,
  skipReturn,
  startFocus,
} from "@/lib/focus-session";

export const runtime = "nodejs";

// The current return card, computed from the confirmed record only.
export async function GET() {
  try {
    const { state } = await requireSession();
    return NextResponse.json(
      { card: returnCard(state), focus: state.focus || null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { id, state: before } = await requireSession();
    const input = await body(request, 20000);
    const currentRevision = before.revision;
    const state = mutate(id, (workspace) => {
      if (workspace.revision !== currentRevision) throw new Error("STALE_CONTEXT");
      switch (input.action) {
        case "start":
          startFocus(workspace, {
            title: input.title,
            minutes: input.minutes,
            outcomeId: input.outcomeId,
            materialId: input.materialId,
          });
          break;
        case "pause":
          pauseFocus(workspace, input.focusId);
          break;
        case "resume":
          resumeFocus(workspace, input.focusId);
          break;
        case "close":
          closeFocus(workspace, { focusId: input.focusId, summary: input.summary, nextStep: input.nextStep });
          break;
        case "skipReturn":
          skipReturn(workspace);
          break;
        case "changeReturn":
          changeReturn(workspace);
          break;
        case "continueReturn":
          continueReturn(workspace);
          break;
        default:
          throw new Error("INVALID_REQUEST");
      }
    });
    return NextResponse.json({ state, card: returnCard(state) });
  } catch (error) {
    return failure(error);
  }
}
