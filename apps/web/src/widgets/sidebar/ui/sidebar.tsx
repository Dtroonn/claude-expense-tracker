import { ArrowLeftRight, Tags, User, Wallet } from 'lucide-react';
import { ThemeToggle } from '@/features/theme-toggle';
import { ROUTES } from '@/shared/config';
import { SidebarNavItem } from './sidebar-nav-item';

const ICON_CLASS = 'size-4 shrink-0';

const NAV_ITEMS = [
  { href: ROUTES.home, label: 'Транзакции', icon: <ArrowLeftRight className={ICON_CLASS} /> },
  { href: ROUTES.categories, label: 'Категории', icon: <Tags className={ICON_CLASS} /> },
  { href: ROUTES.profile, label: 'Профиль', icon: <User className={ICON_CLASS} /> },
];

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between border-r bg-muted/30 p-4">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 px-2 text-sm font-semibold">
          <Wallet className="size-4" />
          Expense Tracker
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem key={item.href} {...item} />
          ))}
        </nav>
      </div>

      <div className="px-2">
        <ThemeToggle />
      </div>
    </aside>
  );
}
