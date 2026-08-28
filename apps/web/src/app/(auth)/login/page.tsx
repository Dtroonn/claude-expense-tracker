import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <LoginForm next={next} />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href={{
              pathname: '/register',
              query: {
                next,
              },
            }}
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
