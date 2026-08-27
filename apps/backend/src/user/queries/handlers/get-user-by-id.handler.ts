import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { type UserRecord } from '../../user.repository';
import { type UserService } from '../../user.service';
import { GetUserByIdQuery } from '../get-user-by-id.query';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(private readonly userService: UserService) {}

  execute(query: GetUserByIdQuery): Promise<UserRecord | null> {
    return this.userService.findById(query.id);
  }
}
