import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@venture-os/shared", "@venture-os/db"],
};

export default nextConfig;
