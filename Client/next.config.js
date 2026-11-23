/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
