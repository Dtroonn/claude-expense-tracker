import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type PaginatedTransactionsDto,
  type TransactionResponseDto,
  type TransactionSummaryDto,
  type UserResponseDto,
} from '@expense-tracker/shared';
import { ZodResponse } from 'nestjs-zod';
import { CreateTransactionDtoClass } from './dto/create-transaction.dto';
import { PaginatedTransactionsDtoClass } from './dto/paginated-transactions.dto';
import { TransactionResponseDtoClass } from './dto/transaction-response.dto';
import { TransactionSummaryDtoClass } from './dto/transaction-summary.dto';
import { TransactionSummaryQueryDtoClass } from './dto/transaction-summary-query.dto';
import { TransactionsQueryDtoClass } from './dto/transactions-query.dto';
import { UpdateTransactionDtoClass } from './dto/update-transaction.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionCommand } from './commands/create-transaction.command';
import { DeleteTransactionCommand } from './commands/delete-transaction.command';
import { UpdateTransactionCommand } from './commands/update-transaction.command';
import { GetTransactionQuery } from './queries/get-transaction.query';
import { GetTransactionSummaryQuery } from './queries/get-transaction-summary.query';
import { GetTransactionsQuery } from './queries/get-transactions.query';
import { type TransactionWithCategory } from './transaction.repository';

function toDto(transaction: TransactionWithCategory): TransactionResponseDto {
  return {
    ...transaction,
    amount: transaction.amount.toNumber(),
    date: transaction.date.toISOString(),
    createdAt: transaction.createdAt.toISOString(),
  };
}

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ZodResponse({ type: TransactionResponseDtoClass })
  async create(
    @CurrentUser() user: UserResponseDto,
    @Body() body: CreateTransactionDtoClass,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.commandBus.execute(new CreateTransactionCommand(user.id, body));
    return toDto(transaction);
  }

  @Get()
  @ZodResponse({ type: PaginatedTransactionsDtoClass })
  async findAll(
    @CurrentUser() user: UserResponseDto,
    @Query() query: TransactionsQueryDtoClass,
  ): Promise<PaginatedTransactionsDto> {
    const { items, total } = await this.queryBus.execute(new GetTransactionsQuery(user.id, query));
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toDto),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasPrev: query.page > 1,
        hasNext: query.page < totalPages,
      },
    };
  }

  @Get('summary')
  @ZodResponse({ type: TransactionSummaryDtoClass })
  summary(
    @CurrentUser() user: UserResponseDto,
    @Query() query: TransactionSummaryQueryDtoClass,
  ): Promise<TransactionSummaryDto> {
    return this.queryBus.execute(new GetTransactionSummaryQuery(user.id, query.month, query.year));
  }

  @Get(':id')
  @ZodResponse({ type: TransactionResponseDtoClass })
  async findOne(
    @CurrentUser() user: UserResponseDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.queryBus.execute(new GetTransactionQuery(user.id, id));
    return toDto(transaction);
  }

  @Patch(':id')
  @ZodResponse({ type: TransactionResponseDtoClass })
  async update(
    @CurrentUser() user: UserResponseDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTransactionDtoClass,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.commandBus.execute(
      new UpdateTransactionCommand(user.id, id, body),
    );
    return toDto(transaction);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() user: UserResponseDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.commandBus.execute(new DeleteTransactionCommand(user.id, id));
  }
}
