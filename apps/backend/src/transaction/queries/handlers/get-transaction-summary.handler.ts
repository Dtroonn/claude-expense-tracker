import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { monthRangeUtc, type TransactionSummaryDto } from '@expense-tracker/shared';
import { TransactionRepository } from '../../transaction.repository';
import { GetTransactionSummaryQuery } from '../get-transaction-summary.query';

@QueryHandler(GetTransactionSummaryQuery)
export class GetTransactionSummaryHandler implements IQueryHandler<GetTransactionSummaryQuery> {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(query: GetTransactionSummaryQuery): Promise<TransactionSummaryDto> {
    const { from, to } = monthRangeUtc(query.year, query.month);

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
