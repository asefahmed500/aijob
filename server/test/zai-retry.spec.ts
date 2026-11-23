import { isPermanentHttpError } from "../src/ai/retry-policy";

describe("AI provider retry classification", () => {
  test("balance and credential errors are permanent", () => {
    expect(isPermanentHttpError(429, '{"code":1113,"msg":"insufficient balance"}')).toBe(true);
    expect(isPermanentHttpError(401, "invalid api key")).toBe(true);
    expect(isPermanentHttpError(403, "forbidden")).toBe(true);
  });

  test("transient rate limits and server errors stay retryable", () => {
    expect(isPermanentHttpError(429, "too many requests")).toBe(false);
    expect(isPermanentHttpError(503, "service unavailable")).toBe(false);
  });
});
