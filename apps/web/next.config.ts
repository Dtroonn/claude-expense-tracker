import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The shared package ships raw TypeScript, so Next must compile it.
  transpilePackages: ['@expense-tracker/shared'],
};

export default nextConfig;
