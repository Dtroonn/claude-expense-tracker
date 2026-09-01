'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui';
import { ROUTES } from '@/shared/config';
import { logout } from '../api/logout';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    await logout();
    router.push(ROUTES.login);
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
