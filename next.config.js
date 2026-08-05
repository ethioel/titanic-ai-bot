/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

const nextConfig = {
  // React configuration
  reactStrictMode: true,
  swcMinify: true,
  compress: true,

  // Server configuration
  experimental: {
    serverComponentsExternalPackages: [
      'scikit-learn',
      'pandas',
      'numpy',
      'joblib',
      'xgboost',
      'catboost',
      'shap',
      'lightgbm'
    ],
    optimizeCss: true,
    webpackBuildWorker: true
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        module: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false
      };
    }
    
    // Python module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@backend': require('path').resolve(__dirname, 'backend'),
      '@models': require('path').resolve(__dirname, 'backend/models'),
      '@components': require('path').resolve(__dirname, 'app/components'),
      '@lib': require('path').resolve(__dirname, 'lib'),
      '@data': require('path').resolve(__dirname, 'data')
    };
    
    return config;
  },

  // Image configuration
  images: {
    domains: ['kaggle.com', 'storage.googleapis.com', 'images.unsplash.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Headers
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ]
      }
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/api',
        destination: '/api/bot/predict',
        permanent: false
      }
    ];
  },

  // Rewrites
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*'
      }
    ];
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_ENABLE_SIMULATION: process.env.ENABLE_SIMULATION,
    NEXT_PUBLIC_ENABLE_SHAP: process.env.ENABLE_SHAP,
    NEXT_PUBLIC_ENABLE_TWIN: process.env.ENABLE_TWIN_MATCHING
  },

  // Output
  output: 'standalone',
  trailingSlash: false,

  // i18n
  i18n: {
    locales: ['en', 'fr', 'es', 'de'],
    defaultLocale: 'en',
    localeDetection: true
  }
};

module.exports = withPWA(nextConfig);