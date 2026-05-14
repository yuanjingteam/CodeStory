import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;
