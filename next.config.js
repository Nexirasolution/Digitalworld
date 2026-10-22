/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pub-7f0ff27354b94232931f393c00e102fa.r2.dev' },      // R2 custom domain
      // { protocol: 'https', hostname: 'res.cloudinary.com' },      // remove after migrating old images
    ],
  },
  eslint: { ignoreDuringBuilds: true },
};
module.exports = nextConfig;