/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],  // adapter ton domaine
    },
  },
}
export default nextConfig
