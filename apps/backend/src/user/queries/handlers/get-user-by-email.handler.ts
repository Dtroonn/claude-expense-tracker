import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserRepository } from '../../user.repository';
import { GetUserByEmailQuery } from '../get-user-by-email.query';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery> {
  constructor(private readonly userRepository: UserRepository) {}

  execute(query: GetUserByEmailQuery) {
    return this.userRepository.findByEmail(query.email);
  }
}
