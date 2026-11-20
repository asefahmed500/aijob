import { validateLetterResponse } from "../src/letter/letter.validator";
import { deterministicLetter } from "../src/ai/deterministic";

describe("letter grounding validation", () => {
  it("keeps grounded claims and flags unknown evidence ids", () => {
    const result = validateLetterResponse(
      {
        letter: "I am applying.\n\nI built a REST API.",
        claims: [
          { sentence: "I am applying.", evidenceId: null },
          { sentence: "I built a REST API.", evidenceId: "evidence-1" },
          { sentence: "I invented a metric.", evidenceId: "does-not-exist" },
        ],
      },
      new Set(["evidence-1"]),
    );

    expect(result.claims).toHaveLength(3);
    expect(result.claims[1].grounded).toBe(true);
    expect(result.claims[2].grounded).toBe(false);
    expect(result.claims[2].evidenceId).toBeNull();
    expect(result.ungroundedCount).toBe(1);
  });

  it("deterministic fallback maps factual sentences to evidence ids", () => {
    const result = deterministicLetter("Acme", "Backend Engineer", [
      { id: "e1", kind: "candidate_proof", claim: "Built a REST API in NestJS." },
      { id: "e2", kind: "job_requirement", claim: "Experience with PostgreSQL is required." },
    ]);
    const validated = validateLetterResponse(result, new Set(["e1", "e2"]));
    expect(validated.content).toContain("Acme");
    expect(validated.claims.some((claim) => claim.evidenceId === "e1" && claim.grounded)).toBe(true);
  });

  it("rejects an empty letter", () => {
    expect(() => validateLetterResponse({ letter: "  ", claims: [] }, new Set())).toThrow();
  });
});
