import { Query } from '@nestjs/cqrs';
import { type TransactionSummaryDto } from '@expense-tracker/shared';

export class GetTransactionSummaryQuery extends Query<TransactionSummaryDto> {
  constructor(
    public readonly userId: string,
    public readonly month: number,
    public readonly year: number,
  ) {
    super();
  }
}
