/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['node-html-parser', 'entities', 'whois-json', 'whois', 'socks'],
  },
};
module.exports = nextConfig;
