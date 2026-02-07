import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
};

module.exports = nextConfig;

module.exports = {
    async redirects() {
      return [
        {
          source: '/',
          destination: '/authentication',
          permanent: true,
        },
      ];
    },
  };
  
export default nextConfig;
