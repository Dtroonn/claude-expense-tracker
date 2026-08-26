import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer auto-loads .env, so load it explicitly. The root .env is
// the one docker-compose uses; a backend-local .env wins if present.
loadEnv({ path: '../../.env' });
loadEnv({ path: '.env', override: true });

/**
 * Prisma 7 moved CLI configuration out of schema.prisma into this file.
 *
 * `datasource.url` here is what `prisma migrate`, `prisma studio` and
 * `prisma db push` connect with. The runtime client does NOT read it — it gets
 * its connection through a driver adapter (see src/prisma/prisma.service.ts).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
