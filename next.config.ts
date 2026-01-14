import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  // Keep native/node-only deps out of the Turbopack server bundle
  // (used by the PDF processing route).
  serverExternalPackages: ['@napi-rs/canvas', 'sharp', 'pdfjs-dist'],
}

export default nextConfig
