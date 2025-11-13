/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.nhost.run',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
    ],
  },
}

module.exports = nextConfig
