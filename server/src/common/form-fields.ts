/**
 * Public application forms. Recruiters define extra questions per job; candidates
 * answer them on the public link. The stored answers are also fed into AI screening
 * so every submitted answer is evidence the scorer can quote.
 */

export const FORM_FIELD_TYPES = ["text", "textarea", "url"] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder: string;
}

export type FormAnswers = Record<string, string>;

const MAX_FIELDS = 20;
const MAX_ANSWER_LENGTH = 5000;

function isFormFieldType(value: unknown): value is FormFieldType {
  return typeof value === "string" && (FORM_FIELD_TYPES as readonly string[]).includes(value);
}

export function normaliseFormFields(value: unknown): FormField[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  const fields: FormField[] = [];

  for (const [index, raw] of value.slice(0, MAX_FIELDS).entries()) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim().slice(0, 120) : "";
    if (!label) continue;

    const requestedId = typeof record.id === "string" ? record.id.trim().slice(0, 64) : "";
    let id = requestedId || `field_${index + 1}`;
    while (used.has(id)) id = `${id}_${index + 1}`;
    used.add(id);

    fields.push({
      id,
      label,
      type: isFormFieldType(record.type) ? record.type : "text",
      required: record.required === true,
      placeholder: typeof record.placeholder === "string" ? record.placeholder.trim().slice(0, 200) : "",
    });
  }
  return fields;
}

export function parseFormFields(raw: string | null | undefined): FormField[] {
  if (!raw) return [];
  try {
    return normaliseFormFields(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function parseFormAnswers(raw: string | null | undefined): FormAnswers {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const answers: FormAnswers = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") answers[key.slice(0, 64)] = value.slice(0, MAX_ANSWER_LENGTH);
    }
    return answers;
  } catch {
    return {};
  }
}

export function serialiseFormAnswers(fields: FormField[], answers: FormAnswers): string | null {
  const clean: FormAnswers = {};
  for (const field of fields) {
    const value = answers[field.id];
    if (typeof value === "string" && value.trim()) {
      clean[field.id] = value.trim().slice(0, MAX_ANSWER_LENGTH);
    }
  }
  return Object.keys(clean).length > 0 ? JSON.stringify(clean) : null;
}

/** Returns human-readable validation errors; the caller maps them to HTTP errors. */
export function validateFormAnswers(fields: FormField[], answers: FormAnswers): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    const value = answers[field.id];
    if (field.required && (!value || !value.trim())) {
      errors.push(`Please answer the required question: ${field.label}`);
    }
    if (typeof value === "string" && value.length > MAX_ANSWER_LENGTH) {
      errors.push(`Answer for "${field.label}" is too long (max ${MAX_ANSWER_LENGTH} characters)`);
    }
  }
  return errors;
}

/** Turns form answers into scorer-visible text while keeping quotes verbatim. */
export function formatAnswersForScreening(fields: FormField[], answers: FormAnswers): string {
  return fields
    .map((field) => {
      const value = answers[field.id];
      return value && value.trim() ? `${field.label}: ${value.trim()}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function isLinkExpired(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  return Number.isFinite(time) && time <= now.getTime();
}
