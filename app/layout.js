import './styles/globals.css';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata = {
  title: 'Titanic AI Bot - Interactive Survival Predictor',
  description: 'AI-powered Titanic survival prediction with SHAP explanations, historical twin matching, and real-time emergency simulation.',
  keywords: 'Titanic, AI, Survival Prediction, Machine Learning, SHAP, Historical, Simulation',
  authors: [{ name: 'Your Name' }],
  openGraph: {
    title: 'Titanic AI Bot',
    description: 'Predict your survival chances with AI, find your historical twin, and experience the emergency simulation.',
    url: 'https://titanic-ai-bot.vercel.app',
    siteName: 'Titanic AI Bot',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Titanic AI Bot',
    description: 'AI-powered survival prediction with interactive features.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a3a5c" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        {children}
        <Analytics />
      </body>
    </html>
  );
}