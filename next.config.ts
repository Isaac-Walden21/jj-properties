import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Keep the native module out of the bundler (CRM uses SQLite server-side).
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
