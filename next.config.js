/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // cheerio must run in Node.js runtime, not Edge runtime
    serverComponentsExternalPackages: ['cheerio'],
  },
}

module.exports = nextConfig
