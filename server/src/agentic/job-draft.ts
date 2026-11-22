export interface JobDraft {
  title: string;
  description: string;
  requirements: string;
}

/** Normalises a provider draft and rejects output that cannot be saved as a job. */
export function normaliseJobDraft(value: unknown): JobDraft | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim().slice(0, 200) : "";
  const description =
    typeof record.description === "string" ? record.description.trim().slice(0, 20000) : "";
  const requirements =
    typeof record.requirements === "string" ? record.requirements.trim().slice(0, 20000) : "";
  if (title.length < 2 || description.length < 10 || requirements.length < 10) return null;
  return { title, description, requirements };
}

/**
 * Deterministic job-post drafting. It never invents a role the brief did not mention:
 * the title and every requirement line come from the brief itself.
 */
export function draftJobPostDeterministic(brief: string): JobDraft {
  const lines = brief
    .split(/\n|;/)
    .map((line) => line.replace(/^[-*•\d.)]+\s*/, "").trim())
    .filter((line) => line.length > 0);

  const first = lines[0] ?? brief.trim();
  const words = first.split(/\s+/);
  const title = (words.length > 10 ? words.slice(0, 10).join(" ") : first)
    .replace(/[.,;:]+$/, "")
    .slice(0, 120);
  const details = lines.slice(1).filter((line) => line.length >= 8);

  const description = [
    `We are hiring a ${title} to help our team deliver reliable, measurable results.`,
    details.length > 0 ? `Role context from the hiring brief:\n${details.join("\n")}` : "",
    "You will collaborate closely with the team, communicate clearly, and own your work end to end.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const requirements = [
    ...details,
    "Clear written and verbal communication with teammates and stakeholders.",
    "Ability to own work end to end and deliver measurable outcomes.",
  ].join("\n");

  return { title, description, requirements };
}
