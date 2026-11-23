/** Balance, credential and quota errors cannot be fixed by retrying. */
export function isPermanentHttpError(status: number, detail: string): boolean {
  if (status === 401 || status === 403) return true;
  return status === 429 && /insufficient balance|1113|quota|credit|exhausted/i.test(detail);
}
