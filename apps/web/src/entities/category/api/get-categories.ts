import type { CategoryResponseDto } from '@expense-tracker/shared';
import { serverFetch } from '@/shared/api/server-fetch';

export async function getCategories(): Promise<CategoryResponseDto[]> {
  return serverFetch<CategoryResponseDto[]>('/categories');
}
