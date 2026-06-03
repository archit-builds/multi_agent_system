/** @type {import('next').NextConfig} */

// Use BACKEND_URL for server-side rewrites (not NEXT_PUBLIC_ which is for the browser).
// Falls back to localhost:8000 for local development automatically.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig