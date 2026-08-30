import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { CategoryModule } from '../category/category.module';
import { CreateTransactionHandler } from './commands/handlers/create-transaction.handler';
import { DeleteTransactionHandler } from './commands/handlers/delete-transaction.handler';
import { UpdateTransactionHandler } from './commands/handlers/update-transaction.handler';
import { GetTransactionSummaryHandler } from './queries/handlers/get-transaction-summary.handler';
import { GetTransactionHandler } from './queries/handlers/get-transaction.handler';
import { GetTransactionsHandler } from './queries/handlers/get-transactions.handler';
import { TransactionController } from './transaction.controller';
import { TransactionRepository } from './transaction.repository';

const commandHandlers = [
  CreateTransactionHandler,
  UpdateTransactionHandler,
  DeleteTransactionHandler,
];
const queryHandlers = [GetTransactionsHandler, GetTransactionHandler, GetTransactionSummaryHandler];

@Module({
  imports: [CqrsModule, AuthModule, CategoryModule],
  controllers: [TransactionController],
  providers: [TransactionRepository, ...commandHandlers, ...queryHandlers],
})
export class TransactionModule {}
