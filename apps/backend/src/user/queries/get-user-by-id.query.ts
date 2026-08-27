import { Query } from '@nestjs/cqrs';
import { type UserRecord } from '../user.repository';

export class GetUserByIdQuery extends Query<UserRecord | null> {
  constructor(public readonly id: string) {
    super();
  }
}
