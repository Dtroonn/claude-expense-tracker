import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CategoryRepository } from '../../category.repository';
import { GetCategoriesQuery } from '../get-categories.query';

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<GetCategoriesQuery> {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  execute(query: GetCategoriesQuery) {
    return this.categoryRepository.findManyByUserId(query.userId);
  }
}
