import { ExtractedItem } from "../evidence/evidence.validator";
import { LetterResponse } from "../letter/letter.validator";

const REQUIREMENT_HINTS = [
  "required",
  "must have",
  "you will",
  "we are looking for",
  "experience with",
  "years of",
  "responsibilities",
  "skills",
  "qualifications",
  "proficient",
];
const PROOF_HINTS = [
  "built",
  "led",
  "delivered",
  "improved",
  "designed",
  "implemented",
  "managed",
  "reduced",
  "increased",
  "created",
  "shipped",
  "owned",
];

/**
 * Deterministic fallback used only when the configured AI provider cannot be
 * reached (for example, insufficient balance). Every emitted quote is an exact
 * line from the source email, so the evidence trust rule still holds.
 */
export function deterministicEvidence(body: string): ExtractedItem[] {
  const lines = body
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 20 && line.length <= 400)
    .filter((line) => /[a-zA-Z]/.test(line));

  const items: ExtractedItem[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isRequirement = REQUIREMENT_HINTS.some((hint) => lower.includes(hint));
    const isProof = PROOF_HINTS.some((hint) => lower.includes(hint));
    if (!isRequirement && !isProof) continue;
    items.push({
      kind: isRequirement ? "job_requirement" : "candidate_proof",
      claim: line,
      verbatimQuote: line,
      confidence: 0.6,
    });
    if (items.length >= 8) break;
  }
  return items;
}

export interface EvidenceForLetter {
  id: string;
  kind: string;
  claim: string;
}

export function deterministicLetter(
  company: string,
  role: string,
  evidence: EvidenceForLetter[],
): LetterResponse {
  const requirements = evidence.filter((item) => item.kind === "job_requirement").slice(0, 3);
  const proofs = evidence.filter((item) => item.kind === "candidate_proof").slice(0, 3);
  const supporting = proofs.length > 0 ? proofs : evidence.slice(0, 3);

  const paragraphs: string[] = [
    `I am writing to apply for the ${role} position at ${company}.`,
  ];
  const claims: Array<{ sentence: string; evidenceId: string | null }> = [
    { sentence: paragraphs[0], evidenceId: null },
  ];

  for (const item of supporting) {
    const sentence = `In my experience, ${item.claim.charAt(0).toLowerCase()}${item.claim.slice(1)}`;
    paragraphs.push(sentence);
    claims.push({ sentence, evidenceId: item.id });
  }

  if (requirements.length > 0) {
    const sentence = `The role calls for ${requirements.map((item) => item.claim).join("; ")}.`;
    paragraphs.push(sentence);
    for (const item of requirements) {
      claims.push({ sentence: `The role calls for ${item.claim}.`, evidenceId: item.id });
    }
  }

  paragraphs.push("Thank you for considering my application. I would welcome the opportunity to discuss this role.");
  claims.push({ sentence: paragraphs[paragraphs.length - 1], evidenceId: null });

  return { letter: paragraphs.join("\n\n"), claims };
}
