/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Reduce bundle size
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  // Production optimizations
  productionBrowserSourceMaps: false,
}

export default nextConfig


