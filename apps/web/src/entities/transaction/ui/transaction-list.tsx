import type { TransactionResponseDto } from '@expense-tracker/shared';
import { TransactionRow } from './transaction-row';

export function TransactionList({ transactions }: { transactions: TransactionResponseDto[] }) {
  if (transactions.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Транзакций пока нет</p>;
  }

  return (
    <ul>
      {transactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
    </ul>
  );
}
