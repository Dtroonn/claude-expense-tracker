/**
 * Contracts shared between the Next.js frontend and the Nest.js backend.
 *
 * The pattern: define a zod schema, infer the TypeScript type from it, export
 * both. The backend validates incoming/outgoing payloads with the schema; the
 * frontend imports the inferred type (and can reuse the schema to validate
 * responses). One source of truth, no hand-kept duplicate interfaces.
 *
 * Domain contracts (expenses, categories, budgets) go in sibling modules as the
 * app grows — this file only carries the health contract used by the scaffold.
 */
export * from './health';
