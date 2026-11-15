import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the file-tracing / workspace root to this project so a stray
  // lockfile outside the repo can't make Next infer the wrong root
  // (multiple-lockfile warning; breaks serverless file tracing on Vercel).
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
};

export default nextConfig;
