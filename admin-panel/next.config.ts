import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
  allowedDevOrigins: ['10.220.174.10'],
};

export default nextConfig;
