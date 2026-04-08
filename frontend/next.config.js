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

module.exports = nextConfig;
