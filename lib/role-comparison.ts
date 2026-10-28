import type { Direction } from "./types";
type Comparison = Pick<Direction, "summary" | "requirements" | "courseConnection" | "nextMove">;
export async function roleComparison(sourceCount: number, validEvidenceIds: string[], compare: () => Promise<Comparison>, sources?: {excerpt:string}[]): Promise<Comparison & {mode:"live"|"guided"}> {
  try {
    const result = await compare();
    const valid = new Set(validEvidenceIds);
    // Keep supported requirements when one generated item fails its source checks.
    const requirements=result.requirements.filter(requirement => {
      if(requirement.evidenceIds.some(id=>!valid.has(id)))return false;
      if(!sources)return true;
      if(!requirement.sourceQuotes?.length)return false;
      if(requirement.sourceQuotes.some(ref=>!Number.isInteger(ref.sourceIndex)||!ref.quote.trim()||!sources[ref.sourceIndex-1]?.excerpt.includes(ref.quote)))return false;
      return requirement.sourceQuotes.some(ref=>ref.quote.toLocaleLowerCase().includes(requirement.requirement.toLocaleLowerCase()));
    });
    if(result.requirements.length && !requirements.length)throw new Error("MODEL_UNAVAILABLE");
    return { ...result, requirements, mode: "live" as const };
  } catch (error) {
    if (!(error instanceof Error) || !["MODEL_UNAVAILABLE", "DAILY_LIMIT"].includes(error.message)) throw error;
    return {
      summary: `Retrieved ${sourceCount} public sources. ${error.message === "DAILY_LIMIT" ? "The comparison allowance was reached." : "AI comparison couldn't complete."} You can inspect the sources below; no assessment of your work was saved. Check eligibility and whether each role is still open.`,
      requirements: [],
      mode: "guided" as const,
    };
  }
}
