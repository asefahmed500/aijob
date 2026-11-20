export interface ScoreMatch {
  requirement: string;
  quote: string;
  charStart: number;
  charEnd: number;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "had",
  "will", "are", "was", "were", "you", "your", "our", "their", "must", "should",
  "required", "experience", "skills", "ability", "strong", "including", "years",
  "about", "into", "more", "other", "work", "team", "role", "job", "company",
]);

function keywords(text: string): string[] {
  return (text.toLowerCase().match(/[a-zA-Z0-9+#.]{3,}/g) ?? [])
    .filter((word) => !STOP_WORDS.has(word))
    .slice(0, 12);
}

function sentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((line) => line.trim())
    .filter((line) => line.length >= 15 && line.length <= 500);
}

/**
 * Deterministic candidate scoring. Every emitted quote is an exact substring
 * of the resume, so the same trust rule as evidence extraction still applies.
 */
export function scoreDeterministic(
  requirementsText: string,
  resumeText: string,
): ScoreMatch[] {
  const requirements = requirementsText
    .split(/\n|;/)
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter((line) => line.length >= 10 && line.length <= 300);
  const resumeSentences = sentences(resumeText);
  const matches: ScoreMatch[] = [];

  for (const requirement of requirements) {
    const words = keywords(requirement);
    if (words.length === 0) continue;

    let best: { sentence: string; overlap: number; index: number } | null = null;
    for (const sentence of resumeSentences) {
      const lower = sentence.toLowerCase();
      const overlap = words.filter((word) => lower.includes(word)).length;
      if (overlap > 0 && (!best || overlap > best.overlap)) {
        best = { sentence, overlap, index: resumeText.indexOf(sentence) };
      }
    }

    if (best && best.index >= 0 && best.overlap >= Math.max(1, Math.ceil(words.length * 0.25))) {
      matches.push({
        requirement,
        quote: best.sentence,
        charStart: best.index,
        charEnd: best.index + best.sentence.length,
      });
    }
  }
  return matches;
}

export function requirementCount(requirementsText: string): number {
  return requirementsText
    .split(/\n|;/)
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter((line) => line.length >= 10 && line.length <= 300).length;
}
