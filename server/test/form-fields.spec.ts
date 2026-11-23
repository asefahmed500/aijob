import {
  formatAnswersForScreening,
  isLinkExpired,
  normaliseFormFields,
  parseFormAnswers,
  serialiseFormAnswers,
  validateFormAnswers,
} from "../src/common/form-fields";

describe("public application form helpers", () => {
  test("normalises fields, skips invalid ones and keeps ids unique", () => {
    const fields = normaliseFormFields([
      { id: "a", label: " GitHub ", type: "url", required: true, placeholder: "Profile link" },
      { label: "" },
      { label: "Years of experience", type: "unknown", required: "yes" },
      { id: "a", label: "Second question" },
    ]);

    expect(fields).toHaveLength(3);
    expect(fields[0]).toEqual({
      id: "a",
      label: "GitHub",
      type: "url",
      required: true,
      placeholder: "Profile link",
    });
    expect(fields[1].type).toBe("text");
    expect(fields[1].required).toBe(false);
    expect(new Set(fields.map((field) => field.id)).size).toBe(3);
  });

  test("caps the number of custom questions", () => {
    const fields = normaliseFormFields(
      Array.from({ length: 30 }, (_, index) => ({ label: `Question ${index}` })),
    );
    expect(fields).toHaveLength(20);
  });

  test("validates required and overlong answers", () => {
    const fields = normaliseFormFields([{ label: "GitHub", required: true }]);
    expect(validateFormAnswers(fields, {})[0]).toMatch(/GitHub/);
    expect(validateFormAnswers(fields, { field_1: "   " })[0]).toMatch(/GitHub/);
    expect(validateFormAnswers(fields, { field_1: "x".repeat(5001) })[0]).toMatch(/too long/);
    expect(validateFormAnswers(fields, { field_1: "https://example.com" })).toEqual([]);
  });

  test("serialises only known answers and parses them back", () => {
    const fields = normaliseFormFields([{ label: "GitHub" }, { label: "Notes", type: "textarea" }]);
    const stored = serialiseFormAnswers(fields, {
      field_1: " https://example.com ",
      field_2: "I built the API",
      attacker: "ignored",
    });
    expect(stored).toBeTruthy();
    expect(parseFormAnswers(stored)).toEqual({ field_1: "https://example.com", field_2: "I built the API" });
    expect(serialiseFormAnswers(fields, {})).toBeNull();
  });

  test("formats answers as verbatim scorer evidence", () => {
    const fields = normaliseFormFields([{ label: "GitHub" }, { label: "Notes", type: "textarea" }]);
    const text = formatAnswersForScreening(fields, {
      field_1: "https://example.com",
      field_2: "I designed PostgreSQL schemas",
    });
    expect(text).toContain("GitHub: https://example.com");
    expect(text).toContain("Notes: I designed PostgreSQL schemas");
  });

  test("link expiry respects unset, past and future dates", () => {
    const now = new Date("2026-11-23T12:00:00.000Z");
    expect(isLinkExpired(null, now)).toBe(false);
    expect(isLinkExpired("2026-11-23T11:59:00.000Z", now)).toBe(true);
    expect(isLinkExpired("2026-11-24T11:59:00.000Z", now)).toBe(false);
  });
});
