'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ship, 
  Heart, 
  Thermometer, 
  Battery, 
  MapPin, 
  Activity,
  AlertTriangle,
  Clock,
  Shield,
  Backpack,
  Users,
  ChevronRight,
  RotateCcw,
  Waves
} from 'lucide-react';

export default function SimulationConsole({ passengerData, initialProbability = 0.5 }) {
  const [simState, setSimState] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const startSimulation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bot/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'start', 
          passenger_data: passengerData || { Pclass: 2, Sex: 'male', Age: 30, Fare: 13 } 
        }),
      });
      const data = await res.json();
      setSimState(data.state);
      setResult(data);
      setHistory([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [passengerData]);

  const makeDecision = useCallback(async (decisionId) => {
    if (!simState) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bot/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decide', decision_id: decisionId, state: simState }),
      });
      const data = await res.json();
      if (data.state) {
        setHistory(prev => [...prev, result]);
        setSimState(data.state);
        setResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [simState, result]);

  if (!result) {
    return (
      <div className="glass-strong rounded-2xl p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
          <Ship size={32} className="text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Emergency Simulation</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Experience the sinking in real-time. Make decisions that determine your fate based on your passenger profile.
        </p>
        <button onClick={startSimulation} className="btn-primary text-base px-8 py-4">
          <AlertTriangle size={18} />
          Begin Emergency Protocol
        </button>
      </div>
    );
  }

  if (result.complete) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-2xl p-8 text-center max-w-2xl mx-auto"
      >
        <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
          result.survived 
            ? 'bg-emerald-500/20 text-emerald-500' 
            : 'bg-red-500/20 text-red-500'
        }`}>
          {result.survived ? <Shield size={40} /> : <Waves size={40} />}
        </div>
        <h2 className="text-3xl font-bold mb-2">
          {result.survived ? 'You Survived' : 'You Perished'}
        </h2>
        <p className="text-lg text-muted-foreground mb-6">{result.message}</p>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-secondary rounded-xl p-4">
            <div className="text-2xl font-bold">{(result.final_probability * 100).toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Final Probability</div>
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <div className="text-2xl font-bold">{result.decisions?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Decisions</div>
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <div className="text-2xl font-bold">{result.survived ? 'Yes' : 'No'}</div>
            <div className="text-xs text-muted-foreground">Survived</div>
          </div>
        </div>

        <button onClick={startSimulation} className="btn-secondary">
          <RotateCcw size={16} />
          Restart Simulation
        </button>
      </motion.div>
    );
  }

  const status = result.status || {};
  const nextEvent = result.next_event;

  return (
    <div className="space-y-6">
      {/* Top HUD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusBadge 
          icon={Activity} 
          label="Survival" 
          value={`${(result.survival_probability * 100).toFixed(0)}%`} 
          color={result.survival_probability > 0.5 ? 'text-emerald-500' : 'text-red-500'}
        />
        <StatusBadge 
          icon={MapPin} 
          label="Location" 
          value={status.location?.replace(/_/g, ' ') || 'Unknown'} 
        />
        <StatusBadge 
          icon={Thermometer} 
          label="Condition" 
          value={status.condition || 'Healthy'} 
          color={status.condition !== 'healthy' ? 'text-amber-500' : 'text-emerald-500'}
        />
        <StatusBadge 
          icon={Clock} 
          label="Time" 
          value={result.current_time} 
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Narrative */}
        <div className="md:col-span-2 space-y-4">
          <motion.div
            key={result.current_time}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-strong rounded-2xl p-6 md:p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-blue-500 uppercase tracking-wider">
              <Clock size={12} />
              {result.current_time} · {nextEvent?.minutes_from_impact || 0} min after impact
            </div>
            <p className="text-lg md:text-xl leading-relaxed text-foreground font-medium">
              {result.narrative}
            </p>
            {nextEvent?.event && (
              <p className="mt-4 text-sm text-muted-foreground italic border-l-2 border-blue-500/30 pl-4">
                {nextEvent.event}
              </p>
            )}
          </motion.div>

          {/* Choices */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
              What do you do?
            </h3>
            {nextEvent?.choices?.map((choice, i) => (
              <motion.button
                key={choice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => makeDecision(choice.id)}
                disabled={loading}
                className="w-full text-left glass rounded-xl p-4 hover:bg-secondary/80 transition-all duration-200 group disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm font-bold group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{choice.text}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {choice.risk && (
                          <span className="badge bg-red-500/10 text-red-500 border-red-500/20">
                            <AlertTriangle size={10} />
                            Risk
                          </span>
                        )}
                        {choice.energy_cost && (
                          <span className="badge bg-amber-500/10 text-amber-500 border-amber-500/20">
                            <Battery size={10} />
                            -{choice.energy_cost} Energy
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Vitals */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Heart size={14} className="text-red-500" />
              Vitals
            </h3>
            <VitalBar label="Panic" value={status.panic_level || 0} max={10} color="bg-red-500" />
            <VitalBar label="Warmth" value={status.warmth || 10} max={10} color="bg-amber-500" />
            <VitalBar label="Energy" value={status.energy || 10} max={10} color="bg-blue-500" />
            <VitalBar label="Reputation" value={status.reputation || 5} max={10} color="bg-violet-500" />
          </div>

          {/* Inventory */}
          {status.inventory?.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Backpack size={14} className="text-emerald-500" />
                Inventory
              </h3>
              <div className="space-y-2">
                {status.inventory.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm px-3 py-2 bg-secondary rounded-lg">
                    <Shield size={12} className="text-emerald-500" />
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Companions */}
          {status.companions?.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Users size={14} className="text-blue-500" />
                Companions
              </h3>
              <div className="space-y-2">
                {status.companions.map((c, i) => (
                  <div key={i} className="text-sm px-3 py-2 bg-secondary rounded-lg">
                    {c.name} · <span className="text-muted-foreground">{c.relation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decision Log */}
          {result.decisions?.length > 0 && (
            <div className="glass rounded-2xl p-5 max-h-64 overflow-y-auto">
              <h3 className="text-sm font-semibold mb-3">Log</h3>
              <div className="space-y-2">
                {result.decisions.map((d, i) => (
                  <div key={i} className="text-xs text-muted-foreground border-l-2 border-border pl-3 py-1">
                    <span className="font-medium text-foreground">{d.time}</span> — {d.decision}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ icon: Icon, label, value, color = 'text-foreground' }) {
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={`text-sm font-bold capitalize ${color}`}>{value}</div>
      </div>
    </div>
  );
}

function VitalBar({ label, value, max, color }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/{max}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
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
