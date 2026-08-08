'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Share2, 
  Copy, 
  Check, 
  FileText,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';

/**
 * SurvivalReport — A downloadable & shareable prediction report card.
 * Renders over a background image (sharecard-bg.jpg) and exports as PNG.
 * 
 * Requires: npm install html2canvas
 * 
 * Usage:
 *   <SurvivalReport 
 *     prediction={prediction} 
 *     twin={twinData}
 *     passenger={passengerData}
 *   />
 */
export default function SurvivalReport({ 
  prediction, 
  twin = null,
  passenger = null,
  className = '' 
}) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  if (!prediction) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700 ${className}`}>
        <FileText size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Complete a prediction to generate your survival report.
        </p>
      </div>
    );
  }

  const survived = !!prediction.survived;
  const probability = typeof prediction.probability === 'number' ? prediction.probability : 0;
  const confidence = typeof prediction.confidence === 'number' ? prediction.confidence : 0;

  // ── Download as PNG ──
  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      setDownloading(true);
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(cardRef.current, {
        scale: 3,           // Retina quality
        useCORS: true,      // Allow background image
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `titanic-survival-report-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Could not generate image. Make sure html2canvas is installed: npm install html2canvas');
    } finally {
      setDownloading(false);
    }
  };

  // ── Share text ──
  const buildShareText = () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://titanic-ai-bot.vercel.app';
    return `🚢 Titanic AI Survival Report

${survived ? '✅ I SURVIVED!' : '❌ I DID NOT SURVIVE.'}
📊 Survival Probability: ${(probability * 100).toFixed(1)}%
🎯 Model Confidence: ${(confidence * 100).toFixed(0)}%
${twin?.name ? `👥 Historical Twin: ${twin.name}` : ''}

Test your own odds: ${url}`;
  };

  const handleCopy = async () => {
    const text = buildShareText();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!ok) throw new Error('execCommand failed');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Could not copy. Please copy manually.');
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://titanic-ai-bot.vercel.app';
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Titanic Survival Prediction',
          text: `I ${survived ? 'survived' : 'perished'} the Titanic with ${(probability * 100).toFixed(0)}% certainty!`,
          url,
        });
      } else {
        await handleCopy();
      }
    } catch (err) {
      if (err.name !== 'AbortError') await handleCopy();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ═══ The Report Card (what gets captured) ═══ */}
      <div 
        ref={cardRef}
        className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-2xl"
        style={{ aspectRatio: '4/5' }}
      >
        {/* Background image — assumes sharecard-bg.jpg exists in /public */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/sharecard-bg.jpg')" }}
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-8 text-white">
          {/* Header */}
          <div className="text-center">
            <div className="text-xs font-bold tracking-[0.3em] uppercase opacity-70 mb-1">
              RMS Titanic · April 15, 1912
            </div>
            <div className="text-sm font-medium opacity-90">
              AI Survival Report
            </div>
          </div>

          {/* Main Result */}
          <div className="text-center space-y-3">
            <div className="text-6xl">
              {survived ? '🛟' : '🌊'}
            </div>
            <h2 className="text-3xl font-black tracking-tight">
              {survived ? 'SURVIVED' : 'LOST AT SEA'}
            </h2>

            {/* Probability Ring */}
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  fill="none" 
                  stroke={survived ? '#22c55e' : '#ef4444'} 
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${probability * 264} 264`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black">{(probability * 100).toFixed(0)}%</span>
                <span className="text-[10px] uppercase tracking-wider opacity-70">Probability</span>
              </div>
            </div>

            {/* Passenger Info */}
            {passenger && (
              <div className="text-sm opacity-80 space-y-0.5">
                <p className="font-semibold">{passenger.name || 'Anonymous Passenger'}</p>
                <p>{passenger.Age} years · {['', '1st', '2nd', '3rd'][passenger.Pclass]} Class</p>
              </div>
            )}

            {/* Twin */}
            {twin?.name && (
              <div className="text-xs opacity-60 pt-2 border-t border-white/20">
                Historical Twin: {twin.name}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center">
            <div className="text-[10px] opacity-50 tracking-wider uppercase">
              Generated by Titanic AI · titanic-ai-bot.vercel.app
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Action Buttons ═══ */}
      <div className="flex gap-3 max-w-md mx-auto">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        >
          {downloading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {downloading ? 'Generating...' : 'Download'}
        </button>

        <button
          onClick={handleShare}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold text-sm transition-all border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
        >
          <Share2 size={16} />
          Share
        </button>

        <button
          onClick={handleCopy}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
            copied
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        Requires <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">npm install html2canvas</code> for image download
      </p>
    </div>
  );
}
