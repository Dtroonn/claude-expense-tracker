const STORAGE_KEY = 'theme';

/**
 * Sets the `dark` class on <html> before hydration, so there's no flash of the
 * wrong theme. Deliberately a plain `<script>` rendered by a Server Component
 * (NOT 'use client') — a `<script>` element only actually executes when it
 * arrives as part of the server-rendered HTML the browser parses; the same
 * element re-created inside a client component's render (which is what
 * next-themes did) triggers React 19's "script tags are never executed on the
 * client" warning, because from React's second (client) render onward, it's
 * true. Doing it this way is exactly what suppressHydrationWarning on <html>
 * in layout.tsx is there for: this script may set the class before React's
 * client render sees it, so the two can legitimately disagree once.
 */
const script = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'system';
    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
