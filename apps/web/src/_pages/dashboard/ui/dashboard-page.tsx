import { redirect } from 'next/navigation';
import { LogoutButton } from '@/features/auth-logout';
import { ThemeToggle } from '@/features/theme-toggle';
import { getSession } from '@/entities/user';
import { AccountCard } from './account-card';

export async function DashboardPage() {
  const user = await getSession();

  // Defence-in-depth behind the proxy, which already redirects unauthenticated
  // requests to this path.
  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <ThemeToggle />
      </div>

      <AccountCard user={user} />

      <div>
        <LogoutButton />
      </div>
    </main>
  );
}
