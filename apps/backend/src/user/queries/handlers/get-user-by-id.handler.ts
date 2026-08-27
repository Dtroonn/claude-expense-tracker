import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserRepository } from '../../user.repository';
import { GetUserByIdQuery } from '../get-user-by-id.query';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(private readonly userRepository: UserRepository) {}

  execute(query: GetUserByIdQuery) {
    return this.userRepository.findById(query.id);
  }
}
