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
import { type UserResponseDto } from '@expense-tracker/shared';
import { ZodSerializerDto } from 'nestjs-zod';
import { CategoryListResponseDtoClass } from './dto/category-list-response.dto';
import { CategoryResponseDtoClass } from './dto/category-response.dto';
import { CreateCategoryDtoClass } from './dto/create-category.dto';
import { UpdateCategoryDtoClass } from './dto/update-category.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCategoryCommand } from './commands/create-category.command';
import { DeleteCategoryCommand } from './commands/delete-category.command';
import { UpdateCategoryCommand } from './commands/update-category.command';
import { GetCategoriesQuery } from './queries/get-categories.query';
import { type Category } from '@/generated/prisma/client';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ZodSerializerDto(CategoryListResponseDtoClass)
  findAll(@CurrentUser() user: UserResponseDto): Promise<Category[]> {
    return this.queryBus.execute(new GetCategoriesQuery(user.id));
  }

  @Post()
  @ZodSerializerDto(CategoryResponseDtoClass)
  create(
    @CurrentUser() user: UserResponseDto,
    @Body() body: CreateCategoryDtoClass,
  ): Promise<Category> {
    return this.commandBus.execute(
      new CreateCategoryCommand(user.id, body.title, body.color, body.icon),
    );
  }

  @Patch(':id')
  @ZodSerializerDto(CategoryResponseDtoClass)
  update(
    @CurrentUser() user: UserResponseDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoryDtoClass,
  ): Promise<Category> {
    return this.commandBus.execute(new UpdateCategoryCommand(user.id, id, body));
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
