'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Users, RefreshCw, Anchor, Heart, User, Sparkles, Loader2 } from 'lucide-react';

export default function HistoricalTwin({ passengerData, twinData, onRefresh, loading }) {
  // ── Normalize whatever shape the API returns ──
  const normalizeTwin = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    const twin = raw.twin || raw;
    
    const pclass = twin.pclass ?? twin.class ?? 3;
    const sex = twin.sex ?? twin.gender ?? 'unknown';
    const age = twin.age ?? twin.Age ?? '?';
    const name = twin.name || 'Unknown Passenger';
    const survived = typeof twin.survived === 'boolean' ? twin.survived : false;
    
    let similarity = twin.similarity ?? raw.similarity ?? 0;
    if (similarity > 1) similarity = similarity / 100;

    const narrative = raw.narrative || twin.narrative || twin.bio || twin.story || 
      `${name} was a ${age}-year-old ${sex} traveling in ${['', '1st', '2nd', '3rd'][pclass] || '3rd'} Class.`;

    const topMatchesRaw = raw.top_matches || raw.topMatches || [];
    const topMatches = Array.isArray(topMatchesRaw) ? topMatchesRaw : [];

    return {
      name,
      age,
      sex,
      pclass,
      survived,
      similarity,
      narrative,
      topMatches,
    };
  };

  const twin = normalizeTwin(twinData);
  const classNames = { 1: '1st Class', 2: '2nd Class', 3: '3rd Class' };

  // ── Loading ──
  if (loading) {
    return (
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Loader2 size={24} className="text-purple-600 dark:text-purple-400 animate-spin" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Searching the manifest...</p>
      </div>
    );
  }

  // ── Empty ──
  if (!twin) {
    return (
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <Anchor size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Submit your profile to find your historical twin.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* ═══ Main Twin Card ═══ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
              {twin.name?.charAt(0) || '?'}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">
                {twin.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {twin.age} years old · <span className="capitalize">{twin.sex}</span> · {classNames[twin.pclass] || `Class ${twin.pclass}`}
              </p>
            </div>
            
            <div className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold border ${
              twin.survived 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
            }`}>
              {twin.survived ? '🛟 SURVIVED' : '🌊 LOST'}
            </div>
          </div>

          {/* Similarity meter */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-500 dark:text-slate-400">Similarity</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {(twin.similarity * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${twin.similarity * 100}%` }}
                transition={{ duration: 1, delay: 0.2 }}
              />
            </div>
          </div>

          {/* Narrative — REMOVED prose class, using explicit styling */}
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-w-none">
            {twin.narrative}
          </div>
        </div>
      </div>

      {/* ═══ Top Matches ═══ */}
      <AnimatePresence>
        {twin.topMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm overflow-hidden"
          >
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
              Other Close Matches
            </h4>
            <div className="space-y-2">
              {twin.topMatches.slice(0, 3).map((match, i) => {
                const mClass = match.pclass ?? match.class ?? 3;
                const mSurvived = match.survived ?? false;
                const mName = match.name || 'Unknown';
                const mAge = match.age ?? '?';
                
                return (
                  <div 
                    key={i} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <User size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {mName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pl-6 sm:pl-0">
                      <span>{mAge}y · {classNames[mClass] || `Class ${mClass}`}</span>
                      <Heart 
                        size={12} 
                        className={mSurvived ? 'text-green-500 fill-green-500' : 'text-red-500'} 
                      />
                      {typeof match.similarity === 'number' && (
                        <span className="font-bold text-purple-500 dark:text-purple-400">
                          {(match.similarity > 1 ? match.similarity / 100 : match.similarity) * 100}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refresh */}
      <button 
        onClick={onRefresh} 
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]"
      >
        <RefreshCw size={14} />
        Refresh Match
      </button>
    </motion.div>
  );
}
