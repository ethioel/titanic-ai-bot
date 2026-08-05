/** @type {import('next').NextConfig} */
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
  },
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
    localeDetection: false,
  },
  output: 'standalone',
  trailingSlash: false,
};

module.exports = nextConfig;
