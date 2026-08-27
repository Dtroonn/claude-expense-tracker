import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { type UserRecord } from '../../user.repository';
import { type UserService } from '../../user.service';
import { GetUserByEmailQuery } from '../get-user-by-email.query';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery> {
  constructor(private readonly userService: UserService) {}

  execute(query: GetUserByEmailQuery): Promise<UserRecord | null> {
    return this.userService.findByEmail(query.email);
  }
}
