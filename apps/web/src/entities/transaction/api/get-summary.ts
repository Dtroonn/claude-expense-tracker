import type { TransactionSummaryDto } from '@expense-tracker/shared';
import { serverFetch } from '@/shared/api/server-fetch';

/** Hits the existing GET /transactions/summary — the backend already computes this; nothing to rebuild here. */
export async function getTransactionSummary(
  month: number,
  year: number,
): Promise<TransactionSummaryDto> {
  const query = new URLSearchParams({ month: String(month), year: String(year) });
  return serverFetch<TransactionSummaryDto>(`/transactions/summary?${query.toString()}`);
}
