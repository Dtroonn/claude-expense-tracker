/**
 * All Intl formatters are created once at module scope, not per render — both
 * for cost and so server and client produce byte-identical output (no per-call
 * option drift). Every date-related formatter pins `timeZone: 'UTC'` because the
 * backend buckets transactions into months using UTC bounds (see
 * get-transaction-summary.handler.ts) — formatting in the viewer's local zone
 * could shift a transaction across a day boundary and disagree with which
 * month's summary it counted toward.
 */

const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount);
}

/** Prefixes with a sign so income/expense read unambiguously in a list: "+100,00 ₽" / "-100,00 ₽". */
export function formatSignedMoney(amount: number, type: 'INCOME' | 'EXPENSE'): string {
  const sign = type === 'INCOME' ? '+' : '-';
  return `${sign}${moneyFormatter.format(Math.abs(amount))}`;
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatTransactionDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

const monthYearFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * "Апрель 2026". `Intl` gives the nominative case in ru-RU ("апрель", not the
 * genitive "апреля" — verified empirically), but always lowercase, and with a
 * "г." literal after the year ("апрель 2026 г."). `formatToParts` lets us drop
 * the literal precisely rather than regex-stripping a trailing string.
 */
export function formatMonthYear(date: Date): string {
  const parts = monthYearFormatter.formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capitalizedMonth} ${year}`;
}
