import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co', // 🌟 安全信任所有 Supabase 的存储桶域名
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;