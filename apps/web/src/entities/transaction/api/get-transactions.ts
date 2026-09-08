import type { PaginatedTransactionsDto } from '@expense-tracker/shared';
import { serverFetch } from '@/shared/api/server-fetch';

export interface GetTransactionsParams {
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
}

export async function getTransactions(
  params: GetTransactionsParams,
): Promise<PaginatedTransactionsDto> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);

  return serverFetch<PaginatedTransactionsDto>(`/transactions?${query.toString()}`);
}
