import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // emit about/index.html rather than about.html, so /about resolves on any
  // static host instead of relying on GitHub Pages' extensionless fallback
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
  devIndicators: false,
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

export default nextConfig;
