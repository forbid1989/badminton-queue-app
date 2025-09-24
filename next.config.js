/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/icons-material"],
  },
  transpilePackages: [
    "@mui/material",
    "@mui/icons-material",
    "@atlaskit/pragmatic-drag-and-drop",
    "@atlaskit/pragmatic-drag-and-drop-auto-scroll",
    "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator",
  ],
  // output: process.env.NODE_ENV === "production" ? "export" : undefined,
  // basePath: process.env.NODE_ENV === "production" ? "" : "",
  // assetPrefix: process.env.NODE_ENV === "production" ? "" : "",
  // trailingSlash: true,
  // images: { unoptimized: true },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Prevents MIME type sniffing
          },
          {
            key: "X-Frame-Options",
            value: "DENY", // Prevents your site from being embedded in iframes
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin", // Controls referrer information
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
