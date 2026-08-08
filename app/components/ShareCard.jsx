'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Link2 } from 'lucide-react';

export default function ShareCard({ data }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // ── Defensive: handle missing/loading data ──
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
        No prediction data to share yet.
      </div>
    );
  }

  const probability = typeof data.probability === 'number' ? data.probability : 0;
  const survived = !!data.survived;
  const twinName = data.twin?.name || '';

  const buildText = () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://titanic-ai-bot.vercel.app';
    return `🚢 Titanic AI Survival Prediction

${survived ? '✅ I SURVIVED!' : '❌ I DID NOT SURVIVE.'}
Survival Probability: ${(probability * 100).toFixed(1)}%
${twinName ? `Historical Twin: ${twinName}` : ''}

Test your own odds: ${url}`;
  };

  const handleCopy = async () => {
    const text = buildText();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for HTTP / older browsers
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
      console.error('Copy failed:', err);
      alert('Could not copy to clipboard. Please copy manually.');
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://titanic-ai-bot.vercel.app';
    const shareData = {
      title: 'Titanic Survival Prediction',
      text: `I ${survived ? 'survived' : 'did not survive'} the Titanic with ${(probability * 100).toFixed(0)}% certainty!`,
      url,
    };

    try {
      if (navigator.share) {
        setSharing(true);
        await navigator.share(shareData);
      } else {
        // Web Share API not available — fallback to copy
        await handleCopy();
      }
    } catch (err) {
      // User cancelled or share failed — fallback to copy
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        await handleCopy();
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📊 Share Your Result
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Let others test their survival odds.
        </p>
      </div>

      {/* Preview Card */}
      <div className={`rounded-xl p-6 mb-4 text-white ${
        survived 
          ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
          : 'bg-gradient-to-r from-red-500 to-rose-600'
      }`}>
        <div className="text-center">
          <div className="text-5xl mb-2">{survived ? '🛟' : '🌊'}</div>
          <div className="text-2xl font-bold mb-2">
            {survived ? 'YOU SURVIVED!' : 'YOU DID NOT SURVIVE'}
          </div>
          <div className="text-lg opacity-90">
            Probability: {(probability * 100).toFixed(1)}%
          </div>
          {twinName && (
            <div className="text-sm mt-2 opacity-80">
              Historical Twin: {twinName}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        >
          {sharing ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Share2 size={16} />
          )}
          Share
        </button>

        <button
          onClick={handleCopy}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
            copied
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy Text'}
        </button>
      </div>
    </div>
  );
}