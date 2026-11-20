export interface LetterClaimInput {
  sentence: string;
  evidenceId: string | null;
}

export interface LetterResponse {
  letter?: string;
  claims?: LetterClaimInput[];
}

export interface ValidatedClaim extends LetterClaimInput {
  grounded: boolean;
  note: string | null;
}

export interface ValidatedLetter {
  content: string;
  claims: ValidatedClaim[];
  ungroundedCount: number;
}

export function validateLetterResponse(
  response: LetterResponse,
  validEvidenceIds: Set<string>,
): ValidatedLetter {
  const content = (response.letter ?? "").trim();
  if (content.length === 0) {
    throw new Error("Cover letter response contained no letter text");
  }

  const claims: ValidatedClaim[] = (response.claims ?? []).map((claim) => {
    if (claim.evidenceId && validEvidenceIds.has(claim.evidenceId)) {
      return { ...claim, grounded: true, note: null };
    }
    if (!claim.evidenceId) {
      // Greetings, closings and other non-factual phrasing are allowed by the prompt.
      return { ...claim, evidenceId: null, grounded: true, note: null };
    }
    return {
      sentence: claim.sentence,
      evidenceId: null,
      grounded: false,
      note: "Referenced evidence id was not found or not approved",
    };
  });

  return {
    content,
    claims,
    ungroundedCount: claims.filter((claim) => !claim.grounded).length,
  };
}
