import type { PaginationMeta } from '@expense-tracker/shared';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/ui';

/** Private to this page — a second consumer would be the trigger to promote this to a feature. */
export function PaginationControls({ meta }: { meta: PaginationMeta }) {
  if (meta.totalPages <= 1) return null;

  const pages = pageWindow(meta.page, meta.totalPages);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={meta.hasPrev ? `?page=${meta.page - 1}` : undefined}
            aria-disabled={!meta.hasPrev}
            className={!meta.hasPrev ? 'pointer-events-none opacity-50' : undefined}
          />
        </PaginationItem>

        {pages.map((page, index) =>
          page === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-before-${pages[index + 1]}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink href={`?page=${page}`} isActive={page === meta.page}>
                {page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href={meta.hasNext ? `?page=${meta.page + 1}` : undefined}
            aria-disabled={!meta.hasNext}
            className={!meta.hasNext ? 'pointer-events-none opacity-50' : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

/** First, last, and current ±1 — so a 50-page list doesn't render 50 links. */
function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]!);
  }
  return result;
}
