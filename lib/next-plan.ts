import {z} from "zod";
import type {Workspace,Plan} from "./types";
import {guidedPlan,selectWork} from "./planner";
import {model,providerStatus} from "./ai";
import {personalContext} from "./personal-context";
export async function generateNextPlan(id:string,state:Workspace,now=new Date()):Promise<Plan|null>{
      let plan = guidedPlan(state,now);
      if (plan && providerStatus().nebius) {
        const result = await model(
          id,
          'Prepare ONE feasible next action for the supplied priority work. Respect available time; urgent coursework overrides career extras. Return JSON with exactly these field types: title string, description string, minutes integer, reasons array of 1-4 short strings, sourceIds array of strings. Example shape: {"title":"Practise one join","description":"Use the supplied toy data","minutes":15,"reasons":["A confirmed deadline is near"],"sourceIds":[]}. minutes must fit availableMinutes. sourceIds may only use supplied IDs. Be concrete and concise.',
          {
            priorityWork: selectWork(state),
            availableMinutes: state.profile.minutes,
            goal: state.profile.goal,
            personalContext: personalContext(state.profile.lifeContext),
            observations: state.observations
              .filter((o) => !o.removed)
              .slice(-8),
            validSourceIds: [
              ...state.works.map((w) => w.id),
              ...state.observations.filter(o=>!o.removed).map((o) => o.id),
            ],
          },
          z.object({
            title: z.string().min(1).max(180),
            description: z.string().min(1).max(1000),
            minutes: z.number().int().min(5).max(state.profile.minutes),
            reasons: z.array(z.string().max(300)).min(1).max(4),
            sourceIds: z.array(z.string()).max(10),
          }),
        );
        const valid = new Set([
          ...state.works.map((w) => w.id),
          ...state.observations.filter(o=>!o.removed).map((o) => o.id),
        ]);
        if (result.sourceIds.some((s) => !valid.has(s)))
          throw new Error("MODEL_UNAVAILABLE");
        plan = {
          ...plan,
          ...result,
          sourceIds: [...new Set([plan.workId, ...result.sourceIds])],
          mode: "live",
        } as Plan;
      }

return plan;
}
