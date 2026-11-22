type CvSection = "profile" | "skills" | "experience" | "education";

export interface CvDocument {
  headline: string;
  summary: string;
  skills: string[];
  experience: string[];
  education: string[];
  content: string;
}

const SECTION_HEADINGS: Record<string, CvSection> = {
  profile: "profile",
  summary: "profile",
  about: "profile",
  skills: "skills",
  "technical skills": "skills",
  experience: "experience",
  "work experience": "experience",
  "work history": "experience",
  employment: "experience",
  education: "education",
  qualifications: "education",
};

function heading(line: string): CvSection | null {
  const key = line.toLowerCase().replace(/:$/, "").trim();
  return Object.prototype.hasOwnProperty.call(SECTION_HEADINGS, key)
    ? SECTION_HEADINGS[key]
    : null;
}

function keywords(text: string, limit = 10): string[] {
  const stop = new Set([
    "and", "the", "for", "with", "from", "have", "has", "that", "this",
    "work", "team", "role", "years", "using", "built", "strong", "including",
  ]);
  const seen = new Set<string>();
  for (const word of text.toLowerCase().match(/[a-zA-Z0-9+#.]{3,}/g) ?? []) {
    if (!stop.has(word)) seen.add(word);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

export function renderCv(doc: Omit<CvDocument, "content">): string {
  const section = (label: string, items: string[]) =>
    items.length > 0 ? `\n## ${label}\n${items.map((item) => `- ${item}`).join("\n")}\n` : "";

  return [
    `# ${doc.headline}`,
    `\n_${doc.summary}_\n`,
    section("Skills", doc.skills),
    section("Experience", doc.experience),
    section("Education", doc.education),
  ]
    .join("")
    .trim();
}

/** Builds a structured CV using only lines already present in the resume. */
export function buildCvDeterministic(
  name: string,
  email: string,
  resumeText: string,
): CvDocument {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const buckets: Record<CvSection, string[]> = {
    profile: [],
    skills: [],
    experience: [],
    education: [],
  };
  let current: CvSection | null = null;
  const unsectioned: string[] = [];

  for (const line of lines) {
    const found = heading(line);
    if (found) {
      current = found;
      continue;
    }
    if (current) buckets[current].push(line);
    else unsectioned.push(line);
  }

  const headline =
    unsectioned.find((line) => !line.includes("@") && line.length >= 3 && line.length <= 120) ??
    name;
  const skills = buckets.skills.length > 0
    ? buckets.skills.flatMap((line) =>
        line
          .split(/[,;|•]/)
          .map((item) => item.trim())
          .filter((item) => item.length >= 2 && resumeText.includes(item)),
      )
    : keywords(resumeText);
  const experience =
    buckets.experience.length > 0
      ? buckets.experience
      : unsectioned
          .filter((line) => line !== headline && !line.includes(email) && line.length >= 15)
          .slice(0, 12);
  const education = buckets.education.slice(0, 12);
  const profileFacts = buckets.profile.length > 0 ? buckets.profile.join(" ") : "";
  const summary = profileFacts
    ? profileFacts.slice(0, 400)
    : `Resume-based profile for ${name}. Key strengths: ${skills.slice(0, 5).join(", ") || "see experience below"}.`;

  return {
    headline: headline.slice(0, 120),
    summary,
    skills: [...new Set(skills)].slice(0, 20),
    experience: experience.slice(0, 20),
    education,
    content: "",
  };
}

/**
 * Validates an AI CV. AI output is accepted only when headline and summary exist and
 * every structured item is a verbatim substring of the source resume.
 */
export function validateAiCv(value: unknown, resumeText: string): CvDocument | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const headline = typeof record.headline === "string" ? record.headline.trim().slice(0, 120) : "";
  const summary = typeof record.summary === "string" ? record.summary.trim().slice(0, 2000) : "";
  if (headline.length < 3 || summary.length < 10) return null;

  const verbatim = (key: string): string[] =>
    Array.isArray(record[key])
      ? (record[key] as unknown[])
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length >= 2 && item.length <= 500 && resumeText.includes(item))
          .slice(0, 20)
      : [];

  const skills = verbatim("skills");
  const experience = verbatim("experience");
  const education = verbatim("education");
  if (skills.length + experience.length + education.length < 2) return null;

  return {
    headline,
    summary,
    skills,
    experience,
    education,
    content: "",
  };
}
