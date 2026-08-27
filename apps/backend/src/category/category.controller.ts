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
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  type CategoryListResponseDto,
  type CategoryResponseDto,
  type CreateCategoryDto,
  type PublicUser,
  type UpdateCategoryDto,
  categoryListResponseSchema,
  categoryResponseSchema,
  createCategorySchema,
  updateCategorySchema,
} from '@expense-tracker/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCategoryCommand } from './commands/create-category.command';
import { DeleteCategoryCommand } from './commands/delete-category.command';
import { UpdateCategoryCommand } from './commands/update-category.command';
import { GetCategoriesQuery } from './queries/get-categories.query';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: PublicUser): Promise<CategoryListResponseDto> {
    const categories = await this.queryBus.execute(new GetCategoriesQuery(user.id));
    return categoryListResponseSchema.parse(categories);
  }

  @Post()
  async create(
    @CurrentUser() user: PublicUser,
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.commandBus.execute(
      new CreateCategoryCommand(user.id, body.title, body.color, body.icon),
    );
    return categoryResponseSchema.parse(category);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.commandBus.execute(new UpdateCategoryCommand(user.id, id, body));
    return categoryResponseSchema.parse(category);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.commandBus.execute(new DeleteCategoryCommand(user.id, id));
  }
}
