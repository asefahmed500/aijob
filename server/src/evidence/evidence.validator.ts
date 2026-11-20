export interface ExtractedItem {
  kind: "job_requirement" | "candidate_proof";
  claim: string;
  verbatimQuote: string;
  confidence: number;
}

export interface LocatedEvidence {
  kind: string;
  claim: string;
  verbatimQuote: string;
  charStart: number;
  charEnd: number;
  confidence: number;
}

/**
 * Trust boundary: an evidence item is only accepted when its quote is an exact
 * substring of the source email. No quote, no evidence.
 */
export function locateQuote(body: string, quote: string): { start: number; end: number } | null {
  if (!quote || quote.trim().length === 0) return null;
  const start = body.indexOf(quote);
  if (start < 0) return null;
  return { start, end: start + quote.length };
}

export function toLocatedEvidence(
  item: ExtractedItem,
  body: string,
): LocatedEvidence | null {
  const location = locateQuote(body, item.verbatimQuote);
  if (!location) return null;
  if (item.kind !== "job_requirement" && item.kind !== "candidate_proof") return null;
  if (!item.claim || item.claim.trim().length === 0) return null;

  const confidence = Number.isFinite(item.confidence)
    ? Math.min(1, Math.max(0, item.confidence))
    : 0.5;

  return {
    kind: item.kind,
    claim: item.claim.trim(),
    verbatimQuote: item.verbatimQuote,
    charStart: location.start,
    charEnd: location.end,
    confidence,
  };
}
