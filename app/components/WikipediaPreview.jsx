'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

/**
 * WikipediaPreview — Fetches a Wikipedia summary for a person's name.
 * Uses Wikipedia's REST API (no key needed).
 * 
 * Usage:
 *   <WikipediaPreview name="Jack Phillips" />
 */
export default function WikipediaPreview({ name, className = '' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!name || name === 'Unknown Passenger') return;

    let cancelled = false;

    async function fetchWiki() {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        // Try exact name first
        const encoded = encodeURIComponent(name.replace(/\s+/g, '_'));
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
          { cache: 'no-store' }
        );

        if (!res.ok) {
          // Fallback: search for the name
          const searchRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + ' Titanic')}&format=json&origin=*`,
            { cache: 'no-store' }
          );
          const searchData = await searchRes.json();
          const firstResult = searchData?.query?.search?.[0];

          if (!firstResult) {
            throw new Error('No Wikipedia article found');
          }

          const summaryRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title.replace(/\s+/g, '_'))}`,
            { cache: 'no-store' }
          );

          if (!summaryRes.ok) throw new Error('Summary not found');
          const summaryData = await summaryRes.json();
          if (!cancelled) setData(summaryData);
        } else {
          const json = await res.json();
          if (!cancelled) setData(json);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWiki();
    return () => { cancelled = true; };
  }, [name]);

  if (!name || name === 'Unknown Passenger') return null;

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Wikipedia
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {loading ? 'Searching...' : data ? data.title : error ? 'Not found' : 'Learn more'}
            </div>
          </div>
        </div>

        {loading ? (
          <Loader2 size={16} className="text-slate-400 animate-spin" />
        ) : (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800">
              {loading && (
                <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
                  Searching Wikipedia...
                </div>
              )}

              {error && (
                <div className="py-4 flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>No Wikipedia article found for <strong>{name}</strong>. Try searching manually.</span>
                </div>
              )}

              {data && !loading && (
                <div className="pt-4 space-y-3">
                  {data.thumbnail && (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden">
                      <img
                        src={data.thumbnail.source}
                        alt={data.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                      {data.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {data.extract || data.description || 'No summary available.'}
                    </p>
                  </div>

                  {data.content_urls?.desktop?.page && (
                    <a
                      href={data.content_urls.desktop.page}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Read full article
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
