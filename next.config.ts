import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cPanel/Passenger: self-contained server in .next/standalone, started by app.js
  output: "standalone",
};

export default nextConfig;
