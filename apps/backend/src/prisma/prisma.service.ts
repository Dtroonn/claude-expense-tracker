import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
// Prisma 7 emits the client into the schema's `output` dir, so it is imported
// from there rather than from `@prisma/client`. There is no index file — the
// entry point is `client`. Run `pnpm db:generate` first or this will not
// resolve.
import { PrismaClient } from '../generated/prisma/client';

/**
 * Composition, not `extends PrismaClient`: this generator's `PrismaClient`
 * export is a value typed via a generic construct signature
 * (`PrismaClientConstructor`), not a concrete class, so `class X extends
 * PrismaClient` silently loses the instance side ($connect, $disconnect, and
 * every model delegate all type as missing). Confirmed against a minimal
 * repro compiled straight from the generated client — same result even with
 * an explicit constructor. The official Prisma 7 quickstart for this
 * generator also wraps an instance rather than extending, which matches.
 *
 * Prisma 7 requires a driver adapter: the client no longer reads DATABASE_URL
 * from the schema (that `url` property was removed), so the connection string
 * is passed in explicitly here. The CLI reads its own URL from
 * apps/backend/prisma.config.ts — a separate path to the same database.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — copy .env.example to .env at the repo root.');
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export type PrismaClientInstance = ReturnType<typeof createPrismaClient>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  readonly client: PrismaClientInstance = createPrismaClient();

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log('Connected to Postgres');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
