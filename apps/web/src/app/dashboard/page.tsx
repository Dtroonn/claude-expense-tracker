import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/auth/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';

export default async function DashboardPage() {
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

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{user.name}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
            <dt className="text-muted-foreground">Joined</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
          </dl>
        </CardContent>
      </Card>

      <div>
        <LogoutButton />
      </div>
    </main>
  );
}
