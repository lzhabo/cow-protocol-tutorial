import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CoW SDK uses some Node.js-only packages; mark them as server-only
  serverExternalPackages: ["@cowprotocol/cow-sdk"],
};

export default nextConfig;
