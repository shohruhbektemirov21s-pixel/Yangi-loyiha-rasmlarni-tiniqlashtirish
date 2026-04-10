/** @type {import('next').NextConfig} */
const backendInternal = (process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/storage/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/storage/**" },
      { protocol: "http", hostname: "localhost", port: "3000", pathname: "/storage/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "3000", pathname: "/storage/**" }
    ]
  },
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${backendInternal}/api/v1/:path*` },
      { source: "/storage/:path*", destination: `${backendInternal}/storage/:path*` }
    ];
  }
};

export default nextConfig;
