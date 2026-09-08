import { redirect } from 'next/navigation';
import { getSession } from '@/entities/user';
import { getCategories } from '@/entities/category/api/get-categories';
import { CategoryRow } from '@/entities/category';
import { UnauthorizedError } from '@/shared/api/server-fetch';
import { ROUTES } from '@/shared/config';

export async function CategoriesPage() {
  const user = await getSession();
  if (!user) redirect(ROUTES.login);

  let categories;
  try {
    categories = await getCategories();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect(ROUTES.login);
    throw error;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Категории</h1>

      {categories.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Категорий пока нет</p>
      ) : (
        <ul>
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      )}
    </div>
  );
}
