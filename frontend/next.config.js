const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  importScripts: ["/custom-sw.js"],
  buildExcludes: [/middleware-manifest\.json$/],
  fallbacks: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ideogram.ai" },
      { protocol: "https", hostname: "*.ideogram.ai" },
      { protocol: "https", hostname: "bannerbear.com" },
      { protocol: "https", hostname: "*.bannerbear.com" },
    ],
  },
};

module.exports = withPWA(nextConfig);
