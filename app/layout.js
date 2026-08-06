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
  
  // ── FIX: metadataBase makes OG/Twitter image URLs absolute ──
  metadataBase: new URL('https://titanic-ai-bot.vercel.app'),
  
  // ── FIX: icons moved to ROOT level, not inside openGraph ──
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  
  openGraph: {
    title: 'Titanic AI — Would You Survive?',
    description: 'Predict your survival chances with a state-of-the-art ensemble model.',
    url: '/',
    siteName: 'Titanic AI',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'en_US',
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
      {/*
        NOTE: Next.js App Router auto-generates <head> tags from the metadata export above.
        Manual <head> / <link rel="icon"> is unnecessary and can conflict.
      */}
      <body className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
