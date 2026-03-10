import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint config removed for Next.js 15+ compatibility
};

export default nextConfig;
