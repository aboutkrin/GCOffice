import withSerwist from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

const isDev = process.env.NODE_ENV === "development";

export default withSerwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
})(nextConfig);
