'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Share2, 
  Copy, 
  Check, 
  FileText,
  Loader2,
  ImageIcon
} from 'lucide-react';

export default function SurvivalReport({ 
  prediction, 
  twin = null,
  passenger = null,
  className = '' 
}) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

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

  const getOgImageUrl = () => {
    const params = new URLSearchParams({
      survived: String(survived),
      prob: String(probability),
      name: passenger?.name || 'You',
      ...(passenger?.Pclass && { class: String(passenger.Pclass) }),
      ...(twin?.name && { twin: twin.name }),
    });
    return `/api/share?${params.toString()}`;
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const url = getOgImageUrl();
      const res = await fetch(url);
      if (!res.ok) throw new Error('Image not available');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `titanic-report-${passenger?.name?.replace(/\s+/g, '-').toLowerCase() || 'you'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(getOgImageUrl(), '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const buildShareText = () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://titanic-ai-bot.vercel.app';
    return `🚢 Titanic AI Survival Report\n\n${survived ? '✅ I SURVIVED!' : '❌ I DID NOT SURVIVE.'}\n📊 Probability: ${(probability * 100).toFixed(1)}%\n🎯 Confidence: ${(confidence * 100).toFixed(0)}%\n${twin?.name ? `👥 Twin: ${twin.name}` : ''}\n\n${url}`;
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
      {/* ═══ Report Preview ═══ */}
      <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">

        {/* Try OG image first */}
        {!imgError ? (
          <img 
            src={getOgImageUrl()} 
            alt="Survival Report" 
            className="w-full h-auto"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          /* ══ CSS Fallback Card ══ */
          <div 
            className={`relative w-full aspect-[1200/630] flex flex-col items-center justify-center text-white p-8 ${
              survived 
                ? 'bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900'
                : 'bg-gradient-to-br from-red-900 via-rose-800 to-orange-900'
            }`}
          >
            {/* Subtle noise texture overlay */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }} />

            <div className="relative z-10 text-center space-y-2">
              <div className="text-5xl">{survived ? '🛟' : '🌊'}</div>
              <h2 className="text-2xl font-black tracking-tight">
                {passenger?.name || 'You'} {survived ? 'SURVIVED' : 'PERISHED'}
              </h2>
              <p className="text-sm opacity-80">
                {['','1st','2nd','3rd'][passenger?.Pclass] || 'RMS Titanic'} Class
              </p>
              <div className="text-3xl font-bold">{(probability * 100).toFixed(1)}%</div>
              <p className="text-xs opacity-60 uppercase tracking-widest">Survival Probability</p>
              {twin?.name && (
                <p className="text-xs opacity-70 pt-2 border-t border-white/20">
                  Twin: {twin.name}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Action Buttons ═══ */}
      <div className="flex gap-3 max-w-md mx-auto">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {downloading ? 'Downloading...' : 'Download'}
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
    </div>
  );
}
