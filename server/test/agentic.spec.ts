import { draftJobPostDeterministic, normaliseJobDraft } from "../src/agentic/job-draft";
import {
  buildCvDeterministic,
  renderCv,
  validateAiCv,
} from "../src/agentic/cv-builder";

describe("deterministic job-post drafting", () => {
  const brief = [
    "Senior Backend Engineer",
    "PostgreSQL schema design; NestJS REST APIs; JWT authentication",
  ].join("\n");

  it("uses the brief for the title and every requirement", () => {
    const draft = draftJobPostDeterministic(brief);
    expect(draft.title).toContain("Senior Backend Engineer");
    expect(draft.requirements).toContain("NestJS REST APIs");
    expect(draft.description.length).toBeGreaterThan(10);
  });

  it("rejects incomplete provider drafts", () => {
    expect(normaliseJobDraft({ title: "Role", description: "short" })).toBeNull();
    expect(
      normaliseJobDraft({
        title: "Role",
        description: "A sufficiently long description.",
        requirements: "A requirement line.",
      }),
    ).not.toBeNull();
  });
});

describe("structured CV generation", () => {
  const resume = [
    "Jane Doe",
    "jane@example.com",
    "Experience",
    "Built NestJS APIs with PostgreSQL and JWT authentication.",
    "Led a team of four engineers.",
    "Education",
    "BSc Computer Science, City University",
    "Skills",
    "NestJS, PostgreSQL, React",
  ].join("\n");

  it("parses sections from the resume without inventing facts", () => {
    const cv = buildCvDeterministic("Jane Doe", "jane@example.com", resume);
    expect(cv.headline).toBe("Jane Doe");
    expect(cv.skills).toContain("NestJS");
    expect(cv.experience).toContain("Built NestJS APIs with PostgreSQL and JWT authentication.");
    expect(cv.education).toContain("BSc Computer Science, City University");
    const content = renderCv(cv);
    expect(content).toContain("## Experience");
    for (const item of cv.experience) expect(resume.includes(item)).toBe(true);
  });

  it("rejects AI items that are not verbatim in the resume", () => {
    const valid = validateAiCv(
      {
        headline: "Jane Doe",
        summary: "Backend engineer with API experience.",
        skills: ["NestJS", "Made-up language"],
        experience: ["Built NestJS APIs with PostgreSQL and JWT authentication."],
        education: [],
      },
      resume,
    );
    expect(valid).not.toBeNull();
    expect(valid?.skills).toEqual(["NestJS"]);

    expect(
      validateAiCv(
        {
          headline: "Jane Doe",
          summary: "Invented summary.",
          skills: ["Quantum telepathy"],
          experience: [],
          education: [],
        },
        resume,
      ),
    ).toBeNull();
  });
});
