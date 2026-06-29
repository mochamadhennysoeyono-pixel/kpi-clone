
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  experimental: {
    serverActions: {
      maxDuration: 120, // 2 minutes
    },
  },
  serverExternalPackages: ['exceljs'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.scalev.id',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'korporaconsulting.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
