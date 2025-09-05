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
  // For GitHub Pages deployment (keep your current setup)
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  basePath: process.env.NODE_ENV === "production" ? "" : "",
  assetPrefix: process.env.NODE_ENV === "production" ? "" : "",
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
