'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ship, Heart, Thermometer, Battery, MapPin, Activity,
  AlertTriangle, Clock, Shield, Backpack, Users,
  ChevronRight, RotateCcw, Waves, Loader2
} from 'lucide-react';

export default function SimulationConsole({ passengerData, prediction, ready }) {
  const [simState, setSimState] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [probability, setProbability] = useState(0.5);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [complete, setComplete] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  // Reset when passenger changes
  useEffect(() => {
    setSimState(null);
    setCurrentScenario(null);
    setProbability(prediction?.probability || 0.5);
    setHistory([]);
    setError(null);
    setComplete(false);
    setFinalResult(null);
  }, [passengerData, prediction]);

  // ── Start: unified payload shape ──
  const startSimulation = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const baseProb = prediction?.probability || 0.5;
      const res = await fetch('/api/bot/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passenger_data: passengerData || { pclass: 2, sex: 'male', age: 30, fare: 13 },
          start: true,
          initial_probability: baseProb,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start simulation');

      // ── Accept both current_scenario and next_event shapes ──
      const scenario = data.current_scenario || data.next_event || null;
      
      setSimState(data.state || null);
      setCurrentScenario(scenario);
      setProbability(data.survival_probability ?? baseProb);
      setComplete(false);
      setFinalResult(null);
      setHistory([]);

      // Seed first history entry
      if (scenario || data.message) {
        setHistory([{
          type: 'scenario',
          time: data.current_time || '11:40 PM',
          title: scenario?.title || 'The Collision',
          content: data.message || scenario?.narrative || 'The simulation has begun.',
        }]);
      }
    } catch (err) {
      console.error('Sim start error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [passengerData, prediction]);

  // ── Decide: stateless, send full state back ──
  const makeDecision = useCallback(async (decisionId) => {
    if (!simState) {
      setError('Simulation state lost. Please restart.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bot/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision_id: decisionId,
          state: simState,
          current_probability: probability,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Decision failed');

      // ── Normalize response shape ──
      const scenario = data.current_scenario || data.next_event || null;
      const isComplete = data.complete || false;
      const newProb = data.survival_probability ?? probability;

      setSimState(data.state || null);
      setCurrentScenario(isComplete ? null : scenario);
      setProbability(newProb);

      // Append to history
      setHistory(prev => {
        const next = [...prev];
        // Record outcome of the choice we just made
        if (data.last_outcome) {
          next.push({
            type: 'outcome',
            content: data.last_outcome.narrative || data.last_outcome.text || 'You made your choice.',
            impact: data.last_outcome.impact,
          });
        }
        // Record next scenario (if not complete)
        if (!isComplete && scenario) {
          next.push({
            type: 'scenario',
            time: data.current_time || scenario.time,
            title: scenario.title,
            content: data.message || scenario.narrative,
          });
        }
        return next;
      });

      // Final result
      if (isComplete) {
        setComplete(true);
        setFinalResult({
          survived: data.survived ?? (newProb > 0.5),
          probability: newProb,
          message: data.message || data.finalNarrative || 'Simulation complete.',
        });
      }
    } catch (err) {
      console.error('Decision error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [simState, probability]);

  // ── Render helpers ──
  const getProbColor = (p) => {
    if (p > 0.6) return 'text-green-600 dark:text-green-400';
    if (p > 0.3) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProbBar = (p) => {
    if (p > 0.6) return 'bg-green-500';
    if (p > 0.3) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // ═══════════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════════
  if (!simState && !complete) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 md:p-12 text-center shadow-sm">
        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <Ship size={28} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Emergency Simulation
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 md:mb-8 max-w-md mx-auto">
          Experience the sinking in real-time. Make decisions that determine your fate based on your passenger profile.
        </p>
        <button 
          onClick={startSimulation} 
          disabled={loading || !ready}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-xl font-semibold text-sm md:text-base bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <AlertTriangle size={18} />}
          {loading ? 'Initializing...' : 'Begin Emergency Protocol'}
        </button>
        {!ready && (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Submit your profile in the Predict tab first.
          </p>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // COMPLETE / RESULT
  // ═══════════════════════════════════════════════════
  if (complete && finalResult) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto shadow-sm"
      >
        <div className={`w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 rounded-full flex items-center justify-center ${
          finalResult.survived 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        }`}>
          {finalResult.survived ? <Shield size={36} /> : <Waves size={36} />}
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {finalResult.survived ? 'You Survived' : 'You Perished'}
        </h2>
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 mb-6 whitespace-pre-wrap">
          {finalResult.message}
        </p>
        
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 md:p-4 border border-slate-100 dark:border-slate-700">
            <div className={`text-xl md:text-2xl font-bold ${getProbColor(finalResult.probability)}`}>
              {(finalResult.probability * 100).toFixed(0)}%
            </div>
            <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              Final Probability
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 md:p-4 border border-slate-100 dark:border-slate-700">
            <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              {history.filter(h => h.type === 'outcome').length}
            </div>
            <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              Decisions
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 md:p-4 border border-slate-100 dark:border-slate-700">
            <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              {finalResult.survived ? 'Yes' : 'No'}
            </div>
            <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              Survived
            </div>
          </div>
        </div>

        <button 
          onClick={startSimulation} 
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]"
        >
          <RotateCcw size={16} />
          Restart Simulation
        </button>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════
  // ACTIVE SIMULATION
  // ═══════════════════════════════════════════════════
  return (
    <div className="space-y-4 md:space-y-6">
      
      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-800 dark:text-red-200 flex items-start gap-2"
          >
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top HUD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <StatusBadge 
          icon={Activity} 
          label="Survival" 
          value={`${(probability * 100).toFixed(0)}%`} 
          color={getProbColor(probability)}
        />
        <StatusBadge 
          icon={MapPin} 
          label="Location" 
          value={currentScenario?.id?.replace(/_/g, ' ') || 'Boat Deck'} 
        />
        <StatusBadge 
          icon={Thermometer} 
          label="Condition" 
          value={probability > 0.5 ? 'Stable' : 'Critical'} 
          color={probability > 0.5 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
        />
        <StatusBadge 
          icon={Clock} 
          label="Time" 
          value={currentScenario?.time || '11:40 PM'} 
        />
      </div>

      {/* Probability Bar */}
      <div className="p-3 md:p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Survival Probability
          </span>
          <span className={`text-lg font-black ${getProbColor(probability)}`}>
            {(probability * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${probability * 100}%` }}
            transition={{ duration: 0.8 }}
            className={`h-full rounded-full ${getProbBar(probability)}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Main Narrative + Choices */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Current Scenario */}
          <motion.div
            key={currentScenario?.id || 'scenario'}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-8 relative overflow-hidden shadow-sm"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
            <div className="flex items-center gap-2 mb-3 md:mb-4 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <Clock size={12} />
              {currentScenario?.time || '11:40 PM'}
            </div>
            <div className="text-base md:text-lg leading-relaxed text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
              {currentScenario?.narrative || 'The situation unfolds...'}
            </div>
          </motion.div>

          {/* Choices */}
          <div className="space-y-2 md:space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
              What do you do?
            </h3>
            {currentScenario?.choices?.map((choice, i) => (
              <motion.button
                key={choice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => makeDecision(choice.id)}
                disabled={loading}
                className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 group disabled:opacity-40 shadow-sm"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500 transition-colors flex-shrink-0">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm md:text-base text-slate-900 dark:text-white">
                      {choice.text}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors flex-shrink-0" />
                </div>
              </motion.button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={24} className="text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Vitals */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Heart size={14} className="text-red-500" />
              Vitals
            </h3>
            <VitalBar label="Panic" value={Math.max(0, Math.min(10, 10 - probability * 10))} max={10} color="bg-red-500" />
            <VitalBar label="Hope" value={Math.max(0, Math.min(10, probability * 10))} max={10} color="bg-blue-500" />
            <VitalBar label="Energy" value={Math.max(3, Math.min(10, 5 + probability * 5))} max={10} color="bg-amber-500" />
          </div>

          {/* Decision Log */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm max-h-64 overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Log</h3>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div 
                    key={i} 
                    className={`text-xs border-l-2 pl-3 py-1 ${
                      h.type === 'outcome' 
                        ? 'border-amber-400 text-slate-600 dark:text-slate-400' 
                        : 'border-blue-400 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold text-slate-900 dark:text-white">{h.time || h.title}</span>
                    {' — '}
                    <span className="line-clamp-2">{h.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reset */}
          <button 
            onClick={startSimulation} 
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
          >
            <RotateCcw size={14} />
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ icon: Icon, label, value, color = 'text-slate-900 dark:text-white' }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</div>
        <div className={`text-sm font-bold capitalize truncate ${color}`}>{value}</div>
      </div>
    </div>
  );
}

function VitalBar({ label, value, max, color }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-medium text-slate-700 dark:text-slate-300">{Math.round(value)}/{max}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
