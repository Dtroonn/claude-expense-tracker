import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import '@/app/styles/globals.css';
import { ThemeProvider, ThemeScript } from '@/shared/theme';
import { cn } from '@/shared/lib/utils';

const geist = Geist({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Track expenses across categories and budgets.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
