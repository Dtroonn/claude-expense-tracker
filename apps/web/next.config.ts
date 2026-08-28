import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';

// Next only reads apps/web/.env*, but JWT_REFRESH_EXPIRES_IN lives in the shared root
// .env (same approach as apps/backend/prisma.config.ts).
loadEnv({ path: '../../.env' });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The shared package ships raw TypeScript, so Next must compile it.
  transpilePackages: ['@expense-tracker/shared'],
};

export default nextConfig;
