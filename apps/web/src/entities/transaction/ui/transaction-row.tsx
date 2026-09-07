import type { TransactionResponseDto } from '@expense-tracker/shared';
import { cn } from '@/shared/lib/utils';
import { formatSignedMoney, formatTransactionDate } from '../lib/format';

export function TransactionRow({ transaction }: { transaction: TransactionResponseDto }) {
  const isIncome = transaction.type === 'INCOME';

  return (
    <li className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="flex items-center gap-3 overflow-hidden">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: transaction.category.color }}
          aria-hidden
        />
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm">
            {transaction.description ?? transaction.category.title}
          </span>
          <span className="text-xs text-muted-foreground">
            {transaction.category.title} · {formatTransactionDate(transaction.date)}
          </span>
        </div>
      </div>

      <span
        className={cn(
          'shrink-0 text-sm font-medium tabular-nums',
          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
        )}
      >
        {formatSignedMoney(transaction.amount, transaction.type)}
      </span>
    </li>
  );
}
