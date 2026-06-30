/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // تحسين الصور
  images: {
    domains: [],
    unoptimized: true,
  },
}

module.exports = nextConfig
