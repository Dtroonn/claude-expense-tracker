import { type PublicUser, publicUserSchema } from '@expense-tracker/shared';
import { type UserRecord } from '../user/user.repository';

export function toPublicUser(user: UserRecord): PublicUser {
  return publicUserSchema.parse({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  });
}
