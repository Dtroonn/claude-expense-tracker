import type { UserResponseDto } from '@expense-tracker/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';

/**
 * Descendant of the (now-deleted) dashboard's account-card.tsx: same
 * Card > CardHeader > CardTitle > CardContent > two-column <dl> structure.
 * Registration date uses an explicit 'ru-RU' locale and 'UTC' time zone —
 * the original component called toLocaleDateString() with no locale, which is
 * a live server/client hydration-mismatch hazard (server formats by process
 * locale, browser by the visitor's). Don't reintroduce that.
 */
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function ProfileCard({ user }: { user: UserResponseDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Профиль</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Имя</dt>
          <dd>{user.name}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-muted-foreground">Дата регистрации</dt>
          <dd>{dateFormatter.format(new Date(user.createdAt))}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
