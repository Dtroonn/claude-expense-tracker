import type { TransactionSummaryDto } from '@expense-tracker/shared';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import { formatMoney } from '@/entities/transaction';
import { cn } from '@/shared/lib/utils';

export function SummaryCards({ summary }: { summary: TransactionSummaryDto }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between font-normal text-muted-foreground">
            Доходы
            <ArrowUpRight className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatMoney(summary.totalIncome)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between font-normal text-muted-foreground">
            Расходы
            <ArrowDownLeft className="size-4 text-destructive" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-semibold text-destructive">
            {formatMoney(summary.totalExpense)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between font-normal text-muted-foreground">
            Баланс
            <Scale className="size-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className={cn('text-2xl font-semibold', summary.balance < 0 && 'text-destructive')}>
            {formatMoney(summary.balance)}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
