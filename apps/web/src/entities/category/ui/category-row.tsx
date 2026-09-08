import type { CategoryResponseDto } from '@expense-tracker/shared';

export function CategoryRow({ category }: { category: CategoryResponseDto }) {
  return (
    <li className="flex items-center gap-3 border-b py-3 last:border-b-0">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
        aria-hidden
      />
      <span className="text-sm">{category.title}</span>
    </li>
  );
}
