import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { type TransactionSummaryDto } from '@expense-tracker/shared';
import { TransactionRepository } from '../../transaction.repository';
import { GetTransactionSummaryQuery } from '../get-transaction-summary.query';

@QueryHandler(GetTransactionSummaryQuery)
export class GetTransactionSummaryHandler implements IQueryHandler<GetTransactionSummaryQuery> {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(query: GetTransactionSummaryQuery): Promise<TransactionSummaryDto> {
    const from = new Date(Date.UTC(query.year, query.month - 1, 1));
    const to = new Date(Date.UTC(query.year, query.month, 1));

    const groups = await this.transactionRepository.sumByTypeForPeriod(query.userId, from, to);

    const totalIncome = groups.find((g) => g.type === 'INCOME')?._sum.amount?.toNumber() ?? 0;
    const totalExpense = groups.find((g) => g.type === 'EXPENSE')?._sum.amount?.toNumber() ?? 0;

    return {
      month: query.month,
      year: query.year,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }
}
