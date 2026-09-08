import { redirect } from 'next/navigation';
import { getSession } from '@/entities/user';
import { LogoutButton } from '@/features/auth-logout';
import { ROUTES } from '@/shared/config';
import { ProfileCard } from './profile-card';

export async function ProfilePage() {
  const user = await getSession();
  if (!user) redirect(ROUTES.login);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Профиль</h1>
      <ProfileCard user={user} />
      <LogoutButton />
    </div>
  );
}
