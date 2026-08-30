import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionRepository } from '../../transaction.repository';
import { GetTransactionsQuery } from '../get-transactions.query';

@QueryHandler(GetTransactionsQuery)
export class GetTransactionsHandler implements IQueryHandler<GetTransactionsQuery> {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  execute(query: GetTransactionsQuery) {
    return this.transactionRepository.findManyByUserId(query.userId, query.filter);
  }
}
