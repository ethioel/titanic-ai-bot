import './styles/globals.css';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from './components/ThemeProvider';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata = {
  title: 'Titanic AI — Survival Predictor',
  description: 'AI-powered Titanic survival prediction with SHAP explanations, historical twin matching, and immersive emergency simulation.',
  keywords: ['Titanic', 'AI', 'Machine Learning', 'SHAP', 'Survival Prediction', 'Historical Simulation'],
  authors: [{ name: 'Titanic AI Team' }],
  openGraph: {
    title: 'Titanic AI — Would You Survive?',
    description: 'Predict your survival chances with a state-of-the-art ensemble model.',
    url: 'https://titanic-ai-bot.vercel.app',
    siteName: 'Titanic AI',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'en_US',
    icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Titanic AI',
    description: 'AI-powered survival prediction with immersive simulation.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
