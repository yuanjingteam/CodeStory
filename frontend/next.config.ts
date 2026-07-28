import type { NextConfig } from 'next';

const UPLOAD_PROXY_URL =
  process.env.NEXT_PUBLIC_UPLOAD_PROXY_URL || 'http://localhost:3001';
const uploadUrlObj = new URL(UPLOAD_PROXY_URL);

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: uploadUrlObj.protocol.replace(':', '') as 'http' | 'https',
        hostname: uploadUrlObj.hostname,
        port: uploadUrlObj.port,
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${UPLOAD_PROXY_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
