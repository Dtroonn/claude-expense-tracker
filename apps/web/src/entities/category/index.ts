// Note: `api/get-categories.ts` is deliberately NOT re-exported here — same
// reasoning as entities/transaction/index.ts. It's server-only; consumers import
// it directly via '@/entities/category/api/get-categories'.
export { CategoryRow } from './ui/category-row';
