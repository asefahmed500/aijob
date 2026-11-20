import { locateQuote, toLocatedEvidence } from "../src/evidence/evidence.validator";

describe("evidence trust boundary", () => {
  const body = "Built a REST API in NestJS that serves 20k requests per day.";

  it("locates an exact quote and returns character offsets", () => {
    const located = locateQuote(body, "Built a REST API in NestJS");
    expect(located).toEqual({ start: 0, end: 26 });
    expect(body.slice(located!.start, located!.end)).toBe("Built a REST API in NestJS");
  });

  it("rejects a paraphrase that is not an exact substring", () => {
    expect(locateQuote(body, "Created a REST API with NestJS")).toBeNull();
  });

  it("rejects an item whose quote does not exist in the source", () => {
    const result = toLocatedEvidence(
      {
        kind: "candidate_proof",
        claim: "Built an API",
        verbatimQuote: "Built a GraphQL API",
        confidence: 0.9,
      },
      body,
    );
    expect(result).toBeNull();
  });

  it("accepts a valid item and clamps confidence", () => {
    const result = toLocatedEvidence(
      {
        kind: "candidate_proof",
        claim: "Built a REST API",
        verbatimQuote: "Built a REST API",
        confidence: 2,
      },
      body,
    );
    expect(result?.charStart).toBe(0);
    expect(result?.confidence).toBe(1);
  });
});
