/** Clamps a `?page=` search param to a valid page number (>= 1), defaulting to 1 for anything missing or malformed. */
export function parsePage(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}
