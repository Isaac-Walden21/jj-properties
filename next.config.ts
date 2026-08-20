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
  experimental: {
    serverActions: {
      // The CSV guest-list import posts the whole file as a string through a
      // Server Action. Next's default is 1MB, which a few thousand rows of a
      // sloppy export can exceed -- and it fails with an opaque error rather
      // than anything a user could act on. This is the only reason it is raised.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
