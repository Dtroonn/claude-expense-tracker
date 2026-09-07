import { redirect } from 'next/navigation';
import { getSession } from '@/entities/user';
import { getTransactions } from '@/entities/transaction/api/get-transactions';
import { getTransactionSummary } from '@/entities/transaction/api/get-summary';
import { TransactionList, formatMonthYear } from '@/entities/transaction';
import { ROUTES } from '@/shared/config';
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

  // Month boundaries in UTC, matching how the backend buckets the summary (see
  // get-transaction-summary.handler.ts) — dateTo is exclusive-of-next-month via
  // the last instant of the current month.
  const dateFrom = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const dateTo = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

  const [summary, transactions] = await Promise.all([
    getTransactionSummary(month, year),
    getTransactions({ page, limit: PAGE_SIZE, dateFrom, dateTo }),
  ]);

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
