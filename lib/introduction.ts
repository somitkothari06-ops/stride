import { z } from "zod";
import { LifeContextSchema, type LifeContext } from "./personal-context";
export const introFields = ["experience", "interests", "ambitions", "constraints", "learningPreferences"] as const;
export const IntroExtraction = z.object({ facts: z.array(z.object({ field: z.enum(introFields), quote: z.string().trim().min(3).max(1000) })).max(10) });
export function introductionDraft(source: string, existing: LifeContext, result: z.infer<typeof IntroExtraction>): LifeContext {
  const next = { ...existing, story: source };
  for (const fact of result.facts) {
    if (!source.includes(fact.quote)) throw new Error("INTRO_EVIDENCE_INVALID");
    if (!next[fact.field].includes(fact.quote)) next[fact.field] = [next[fact.field], fact.quote].filter(Boolean).join("\n");
  }
  return LifeContextSchema.parse(next);
}
