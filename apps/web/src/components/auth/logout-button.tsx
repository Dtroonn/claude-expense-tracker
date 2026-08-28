'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    // Without this, back-navigation could serve a cached RSC payload rendered
    // while still logged in.
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : null}
      Sign out
    </Button>
  );
}
