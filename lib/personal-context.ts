import { z } from "zod";
export const LifeContextSchema = z.object({
  story: z.string().max(10000),
  experience: z.string().max(4000),
  interests: z.string().max(2000),
  ambitions: z.string().max(2000),
  constraints: z.string().max(2000),
  learningPreferences: z.string().max(1000),
  direction: z.enum(["exploring", "some-ideas", "decided"]),
});
export type LifeContext = z.infer<typeof LifeContextSchema>;
export const emptyLifeContext: LifeContext = { story: "", experience: "", interests: "", ambitions: "", constraints: "", learningPreferences: "", direction: "exploring" };
export function personalContext(context?: LifeContext) {
  if (!context) return null;
  return { direction: context.direction, story: context.story.slice(0, 2500), experience: context.experience.slice(0, 1500), interests: context.interests.slice(0, 1000), ambitions: context.ambitions.slice(0, 1000), constraints: context.constraints.slice(0, 1000), learningPreferences: context.learningPreferences.slice(0, 500), basis: "Student-provided context, not independently verified. A missing goal is valid; propose small exploratory practice, not a diagnosis or career verdict." };
}
