import type { Direction } from "./types";
type Comparison = Pick<Direction, "summary" | "requirements" | "courseConnection" | "nextMove">;
export async function roleComparison(sourceCount: number, validEvidenceIds: string[], compare: () => Promise<Comparison>, sources?: {excerpt:string}[]): Promise<Comparison & {mode:"live"|"guided"}> {
  try {
    const result = await compare();
    const valid = new Set(validEvidenceIds);
    if (result.requirements.some((requirement) => requirement.evidenceIds.some((id) => !valid.has(id))))
      throw new Error("MODEL_UNAVAILABLE");
    if (sources && result.requirements.some(requirement => !requirement.sourceQuotes?.length || requirement.sourceQuotes.some(ref => !Number.isInteger(ref.sourceIndex) || !sources[ref.sourceIndex - 1]?.excerpt.includes(ref.quote) || !ref.quote.trim())))
      throw new Error("MODEL_UNAVAILABLE");
    if (sources && result.requirements.some(requirement => !requirement.sourceQuotes?.some(ref => ref.quote.toLocaleLowerCase().includes(requirement.requirement.toLocaleLowerCase()))))
      throw new Error("MODEL_UNAVAILABLE");
    return { ...result, mode: "live" as const };
  } catch (error) {
    if (!(error instanceof Error) || !["MODEL_UNAVAILABLE", "DAILY_LIMIT"].includes(error.message)) throw error;
    return {
      summary: `Retrieved ${sourceCount} public sources. ${error.message === "DAILY_LIMIT" ? "The comparison allowance was reached." : "AI comparison couldn't complete."} You can inspect the sources below; no assessment of your work was saved. Check eligibility and whether each role is still open.`,
      requirements: [],
      mode: "guided" as const,
    };
  }
}
