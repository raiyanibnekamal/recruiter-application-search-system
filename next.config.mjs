/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Supabase auth + cookies need to flow through the edge middleware.
  experimental: {
    // none — keeping config minimal for stability on Vercel.
  },
};

export default nextConfig;
