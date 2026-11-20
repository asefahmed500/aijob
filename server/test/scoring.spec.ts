import { requirementCount, scoreDeterministic } from "../src/scoring/deterministic-scorer";

describe("deterministic candidate scoring", () => {
  const requirements = [
    "Strong experience with Node.js and TypeScript.",
    "PostgreSQL database design and query optimization.",
    "REST API design and JWT authentication.",
  ].join("\n");
  const resume = [
    "Built a REST API in NestJS and TypeScript serving 20k requests per day.",
    "Designed PostgreSQL schemas and improved query latency by 40% through indexing.",
    "Frontend developer with React experience.",
  ].join("\n");

  it("extracts exact quotes with offsets that resolve in the resume", () => {
    const matches = scoreDeterministic(requirements, resume);
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(resume.includes(match.quote)).toBe(true);
      expect(resume.slice(match.charStart, match.charEnd)).toBe(match.quote);
    }
  });

  it("rejects requirements with no resume support", () => {
    const matches = scoreDeterministic("Kubernetes cluster administration is required.", resume);
    expect(matches).toHaveLength(0);
  });

  it("counts requirements consistently", () => {
    expect(requirementCount(requirements)).toBe(3);
  });
});
