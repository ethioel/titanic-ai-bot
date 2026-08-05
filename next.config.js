/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  experimental: {
    serverComponentsExternalPackages: [
      'scikit-learn',
      'pandas',
      'numpy',
      'joblib',
      'xgboost',
      'catboost',
      'shap',
      'lightgbm',
    ],
    optimizeCss: true,
    webpackBuildWorker: true,
  },
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
        zlib: false,
      };
    }
    return config;
  },
  images: {
    domains: ['kaggle.com', 'storage.googleapis.com'],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_PUBLIC_ENABLE_SIMULATION: process.env.ENABLE_SIMULATION || 'true',
    NEXT_PUBLIC_ENABLE_SHAP: process.env.ENABLE_SHAP || 'true',
    NEXT_PUBLIC_ENABLE_TWIN: process.env.ENABLE_TWIN_MATCHING || 'true',
  },
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
    localeDetection: false,
  },
  output: 'standalone',
  trailingSlash: false,
};

module.exports = withPWA(nextConfig);
