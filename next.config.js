/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow HMR from any device on the local network during development.
  // The previous list was a single hardcoded IP that only matched one
  // machine, so anyone else's phone/laptop was blocked with
  // "Cross-origin access to Next.js dev resources is blocked".
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://[::1]:3000',
    // Any 192.168.x.x or 10.x.x.x LAN host on port 3000.
    'http://192.168.0.0/16:3000',
    'http://10.0.0.0/8:3000',
    'http://172.16.0.0/12:3000',
  ],
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

module.exports = nextConfig;