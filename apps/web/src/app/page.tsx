import { type HealthResponseDto } from '@expense-tracker/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Placeholder page. It calls the backend health endpoint through the shared
 * zod contract, which is the one bit of behaviour worth having in a scaffold:
 * if this renders "ok", then the workspace linking, the shared package, and
 * both apps are wired up correctly.
 */
async function fetchHealth(): Promise<HealthResponseDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    // Backend already validates its own response shape — no need to re-parse it here.
    return (await res.json()) as HealthResponseDto;
  } catch {
    // Backend not running yet — expected before `pnpm dev`.
    return null;
  }
}

export default async function Home() {
  const health = await fetchHealth();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Expense Tracker</h1>
        <p className="mt-2 text-muted-foreground">
          Monorepo scaffold — Next.js frontend, Nest.js backend, Postgres via Prisma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Backend status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {health ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium text-primary">{health.status}</dd>
              <dt className="text-muted-foreground">Service</dt>
              <dd>{health.service}</dd>
              <dt className="text-muted-foreground">Version</dt>
              <dd>{health.version}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No response from <code className="font-mono">{API_URL}/api/health</code>. Start it
              with <code className="font-mono">pnpm dev</code>.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Next: add models to <code className="font-mono">apps/backend/prisma/schema.prisma</code>,
        then run <code className="font-mono">pnpm db:migrate</code>.
      </p>
    </main>
  );
}
