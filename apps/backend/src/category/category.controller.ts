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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type CategoryResponseDto, type UserResponseDto } from '@expense-tracker/shared';
import { ZodResponse } from 'nestjs-zod';
import { CategoryResponseDtoClass } from './dto/category-response.dto';
import { CreateCategoryDtoClass } from './dto/create-category.dto';
import { UpdateCategoryDtoClass } from './dto/update-category.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCategoryCommand } from './commands/create-category.command';
import { DeleteCategoryCommand } from './commands/delete-category.command';
import { UpdateCategoryCommand } from './commands/update-category.command';
import { GetCategoriesQuery } from './queries/get-categories.query';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ZodResponse({ type: [CategoryResponseDtoClass] })
  async findAll(@CurrentUser() user: UserResponseDto): Promise<CategoryResponseDto[]> {
    const categories = await this.queryBus.execute(new GetCategoriesQuery(user.id));
    return categories.map((category) => ({
      ...category,
      createdAt: category.createdAt.toISOString(),
    }));
  }

  @Post()
  @ZodResponse({ type: CategoryResponseDtoClass })
  async create(
    @CurrentUser() user: UserResponseDto,
    @Body() body: CreateCategoryDtoClass,
  ): Promise<CategoryResponseDto> {
    const category = await this.commandBus.execute(
      new CreateCategoryCommand(user.id, body.title, body.color, body.icon),
    );
    return { ...category, createdAt: category.createdAt.toISOString() };
  }

  @Patch(':id')
  @ZodResponse({ type: CategoryResponseDtoClass })
  async update(
    @CurrentUser() user: UserResponseDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoryDtoClass,
  ): Promise<CategoryResponseDto> {
    const category = await this.commandBus.execute(new UpdateCategoryCommand(user.id, id, body));
    return { ...category, createdAt: category.createdAt.toISOString() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() user: UserResponseDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.commandBus.execute(new DeleteCategoryCommand(user.id, id));
  }
}
