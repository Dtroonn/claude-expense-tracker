'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

interface SidebarNavItemProps {
  href: string;
  label: string;
  // A rendered element, not a component reference: a Server Component can't
  // pass a component (a function) as a prop to a Client Component — only
  // plain serializable values and already-rendered elements cross that
  // boundary. Sidebar (server) renders the icon and passes the element down.
  icon: React.ReactNode;
}

export function SidebarNavItem({ href, label, icon }: SidebarNavItemProps) {
  const pathname = usePathname();
  // '/' would match every path with a naive startsWith — only the home route
  // needs an exact match, the rest are fine with a prefix (so nested routes
  // under them stay highlighted too).
  const isActive = href === '/' ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
