'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Volume2, VolumeX, AudioLines } from 'lucide-react';

/**
 * VoiceNarrator — Reads any text aloud using Web Speech API
 * (Free, built into all modern browsers. No API key needed.)
 * 
 * Usage:
 *   <VoiceNarrator 
 *     text={twin.narrative} 
 *     label="Hear your twin's story"
 *   />
 */
export default function VoiceNarrator({ 
  text, 
  label = 'Listen',
  className = '' 
}) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supported, setSupported] = useState(true);
  const [currentWord, setCurrentWord] = useState('');
  const utteranceRef = useRef(null);
  const wordsRef = useRef([]);
  const wordIndexRef = useRef(0);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(() => {
    if (!text || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;      // Slightly slower for gravitas
    utterance.pitch = 0.95;     // Slightly deeper
    utterance.volume = 1;

    // Try to pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => 
      v.name.includes('Google UK English Male') ||
      v.name.includes('Daniel') ||
      v.name.includes('Google US English')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => {
      setSpeaking(true);
      setPaused(false);
      wordsRef.current = text.split(/\s+/);
      wordIndexRef.current = 0;
    };

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        const word = wordsRef.current[wordIndexRef.current];
        if (word) setCurrentWord(word.replace(/[^a-zA-Z]/g, '').toLowerCase());
        wordIndexRef.current++;
      }
    };

    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
      setCurrentWord('');
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
        console.error('Speech error:', e.error);
      }
      setSpeaking(false);
      setPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [text]);

  const pause = () => {
    window.speechSynthesis.pause();
    setPaused(true);
  };

  const resume = () => {
    window.speechSynthesis.resume();
    setPaused(false);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setCurrentWord('');
  };

  if (!supported) {
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 ${className}`}>
        <VolumeX size={14} />
        Voice not supported in this browser
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <AnimatePresence mode="wait">
        {!speaking ? (
          <motion.button
            key="play"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={speak}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Play size={16} fill="white" />
            {label}
          </motion.button>
        ) : paused ? (
          <motion.button
            key="resume"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={resume}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-all active:scale-95"
          >
            <Play size={16} fill="white" />
            Resume
          </motion.button>
        ) : (
          <motion.div
            key="controls"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-2"
          >
            {/* Audio visualizer */}
            <div className="flex items-center gap-0.5 h-6">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: speaking && !paused ? [4, 16 + Math.random() * 8, 4] : 4 
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.4 + i * 0.1,
                    ease: "easeInOut"
                  }}
                  className="w-1 bg-blue-500 dark:bg-blue-400 rounded-full"
                />
              ))}
            </div>

            <button
              onClick={pause}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Pause"
            >
              <Pause size={16} />
            </button>
            <button
              onClick={stop}
              className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              title="Stop"
            >
              <Square size={16} fill="currentColor" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word highlight */}
      <AnimatePresence>
        {speaking && currentWord && (
          <motion.span
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-blue-600 dark:text-blue-400 font-medium hidden sm:inline-block"
          >
            {currentWord}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
