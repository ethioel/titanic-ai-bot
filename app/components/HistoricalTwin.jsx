'use client';

import { motion } from 'framer-motion';
import { Users, RefreshCw, Anchor, Heart, User } from 'lucide-react';

export default function HistoricalTwin({ passengerData, twinData, onRefresh, loading }) {
  if (loading) {
    return (
      <div className="glass-strong rounded-2xl p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-violet-500/10 flex items-center justify-center animate-pulse">
          <Users size={24} className="text-violet-500" />
        </div>
        <p className="text-muted-foreground">Searching the manifest...</p>
      </div>
    );
  }

  if (!twinData?.twin) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
        <Anchor size={32} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">Submit your profile to find your historical twin.</p>
      </div>
    );
  }

  const { twin, narrative, top_matches } = twinData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Main Twin Card */}
      <div className="glass-strong rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
              {twin.name?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="font-bold text-lg">{twin.name}</h3>
              <p className="text-sm text-muted-foreground">
                {twin.age} years old · {twin.gender} · {['', '1st', '2nd', '3rd'][twin.pclass]} Class
              </p>
            </div>
            <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
              twin.survived 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
              {twin.survived ? 'SURVIVED' : 'LOST'}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Similarity</span>
              <span className="font-bold text-violet-500">{(twin.similarity * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${twin.similarity * 100}%` }}
                transition={{ duration: 1, delay: 0.2 }}
              />
            </div>
          </div>

          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {narrative}
          </p>
        </div>
      </div>

      {/* Top Matches */}
      {top_matches?.length > 1 && (
        <div className="glass rounded-2xl p-5">
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Other Close Matches
          </h4>
          <div className="space-y-2">
            {top_matches.slice(1).map((match, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{match.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{match.age}y · {['', '1st', '2nd', '3rd'][match.class]}</span>
                  <Heart size={12} className={match.survived ? 'text-emerald-500 fill-emerald-500' : 'text-red-500'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onRefresh} className="btn-secondary w-full">
        <RefreshCw size={14} />
        Refresh Match
      </button>
    </motion.div>
  );
}
