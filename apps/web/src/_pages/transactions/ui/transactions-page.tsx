import { redirect } from 'next/navigation';
import { getSession } from '@/entities/user';
import { getTransactions } from '@/entities/transaction/api/get-transactions';
import { getTransactionSummary } from '@/entities/transaction/api/get-summary';
import { TransactionList, formatMonthYear } from '@/entities/transaction';
import { UnauthorizedError } from '@/shared/api/server-fetch';
import { ROUTES } from '@/shared/config';
import { monthRangeUtc } from '@expense-tracker/shared';
import { parsePage } from '../lib/parse-page';
import { PaginationControls } from './pagination-controls';
import { SummaryCards } from './summary-cards';

const PAGE_SIZE = 10;

export async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect(ROUTES.login);

  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Same UTC month boundaries the backend's summary query buckets by (see
  // get-transaction-summary.handler.ts), adapted to the list endpoint's
  // inclusive `dateTo` filter by stepping one millisecond back from the
  // (exclusive) start of next month.
  const { from, to } = monthRangeUtc(year, month);
  const dateFrom = from.toISOString();
  const dateTo = new Date(to.getTime() - 1).toISOString();

  let summary, transactions;
  try {
    [summary, transactions] = await Promise.all([
      getTransactionSummary(month, year),
      getTransactions({ page, limit: PAGE_SIZE, dateFrom, dateTo }),
    ]);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect(ROUTES.login);
    throw error;
  }

  if (page > transactions.meta.totalPages) {
    redirect(`${ROUTES.home}?page=${transactions.meta.totalPages}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Транзакции</h1>
        <p className="text-sm text-muted-foreground">{formatMonthYear(now)}</p>
      </div>

      <SummaryCards summary={summary} />

      <div className="flex flex-col gap-4">
        <TransactionList transactions={transactions.items} />
        <PaginationControls meta={transactions.meta} />
      </div>
    </div>
  );
}
