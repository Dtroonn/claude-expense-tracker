import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { CategoryController } from './category.controller';
import { CategoryRepository } from './category.repository';
import { CreateCategoryHandler } from './commands/handlers/create-category.handler';
import { DeleteCategoryHandler } from './commands/handlers/delete-category.handler';
import { UpdateCategoryHandler } from './commands/handlers/update-category.handler';
import { GetCategoriesHandler } from './queries/handlers/get-categories.handler';

const commandHandlers = [CreateCategoryHandler, UpdateCategoryHandler, DeleteCategoryHandler];
const queryHandlers = [GetCategoriesHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [CategoryController],
  providers: [CategoryRepository, ...commandHandlers, ...queryHandlers],
})
export class CategoryModule {}
