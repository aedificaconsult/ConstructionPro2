/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'fictional-waddle-4q7q6wj4jgw9364w-3000.app.github.dev'],
    },
  },
};

module.exports = nextConfig;
