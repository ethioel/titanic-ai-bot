'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  Clock, 
  Ship, 
  User, 
  Users, 
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

export default function SimulationConsole({ 
  passengerData, 
  initialProbability = 0.5,
  onComplete,
  className = '' 
}) {
  const [simulation, setSimulation] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [survivalProbability, setSurvivalProbability] = useState(initialProbability);
  const [logs, setLogs] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [survived, setSurvived] = useState(false);
  
  const logEndRef = useRef(null);
  const timerRef = useRef(null);

  // Timeline events
  const timeline = [
    {
      id: 'impact',
      time: '11:40 PM',
      minutes: 0,
      event: 'Titanic strikes iceberg',
      description: 'The ship has struck an iceberg on the starboard side. Water begins entering the forward compartments.',
      choices: null
    },
    {
      id: 'response',
      time: '11:45 PM',
      minutes: 5,
      event: 'Crew assesses damage',
      description: 'The crew is assessing the damage. Passengers are beginning to notice the ship listing to starboard.',
      choices: [
        { id: 'go_upper', text: 'Head to the upper deck immediately', modifier: 0.05, description: 'Get to the boat deck early' },
        { id: 'stay_cabin', text: 'Go back to your cabin for belongings', modifier: -0.08, description: 'Retrieve valuables' },
        { id: 'help_others', text: 'Help others in your area', modifier: 0.02, description: 'Assist fellow passengers' }
      ]
    },
    {
      id: 'lifeboats',
      time: '11:50 PM',
      minutes: 10,
      event: 'Lifeboats prepared',
      description: 'Lifeboats are being prepared for launch. Women and children are being prioritized.',
      choices: [
        { id: 'rush_lifeboat', text: 'Rush to the lifeboat station', modifier: 0.12, description: 'Try to board early' },
        { id: 'help_launch', text: 'Assist with lifeboat preparation', modifier: 0.05, description: 'Help the crew' },
        { id: 'wait', text: 'Wait for official instructions', modifier: -0.05, description: 'Follow procedure' }
      ]
    },
    {
      id: 'panic',
      time: '11:55 PM',
      minutes: 15,
      event: 'Panic spreads',
      description: 'The ship is listing more severely. Panic is spreading among passengers.',
      choices: [
        { id: 'stay_calm', text: 'Stay calm and follow procedures', modifier: 0.03, description: 'Maintain composure' },
        { id: 'panic', text: 'Panic and push towards lifeboats', modifier: -0.08, description: 'React emotionally' },
        { id: 'help', text: 'Help others remain calm', modifier: 0.02, description: 'Be a leader' }
      ]
    },
    {
      id: 'launch',
      time: '12:00 AM',
      minutes: 20,
      event: 'Lifeboats launching',
      description: 'Lifeboats are being launched. Many are only half full.',
      choices: [
        { id: 'board', text: 'Board a lifeboat if possible', modifier: 0.15, description: 'Take the opportunity' },
        { id: 'stay', text: 'Stay on the ship', modifier: -0.20, description: 'Remain on deck' },
        { id: 'help_launch2', text: 'Help launch more lifeboats', modifier: 0.03, description: 'Assist with loading' }
      ]
    },
    {
      id: 'final',
      time: '12:15 AM',
      minutes: 35,
      event: 'Final moments',
      description: 'The ship is sinking rapidly. Final decisions must be made.',
      choices: [
        { id: 'jump', text: 'Jump into the water', modifier: -0.10, description: 'Take your chances in the water' },
        { id: 'stay_until_end', text: 'Stay on the ship until the end', modifier: -0.15, description: 'Face the inevitable' },
        { id: 'find_raft', text: 'Find debris to hold onto', modifier: 0.08, description: 'Look for flotsam' }
      ]
    }
  ];

  useEffect(() => {
    // Auto-scroll logs
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (isRunning && !isPaused && timerRef.current) {
      // Auto-advance if no choices available
      if (currentEvent && !currentEvent.choices) {
        const timeout = setTimeout(() => {
          advanceEvent();
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [isRunning, isPaused, currentEvent]);

  const startSimulation = () => {
    setIsRunning(true);
    setIsPaused(false);
    setDecisions([]);
    setLogs([]);
    setSurvivalProbability(initialProbability);
    setIsComplete(false);
    setSurvived(false);
    
    // Start from first event
    const firstEvent = timeline[0];
    setCurrentEvent(firstEvent);
    addLog('info', `🚨 Emergency simulation started at ${firstEvent.time}`);
    addLog('info', firstEvent.description);
  };

  const pauseSimulation = () => {
    setIsPaused(true);
    addLog('info', '⏸️ Simulation paused');
  };

  const resumeSimulation = () => {
    setIsPaused(false);
    addLog('info', '▶️ Simulation resumed');
  };

  const resetSimulation = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentEvent(null);
    setDecisions([]);
    setLogs([]);
    setSurvivalProbability(initialProbability);
    setIsComplete(false);
    setSurvived(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const makeDecision = (choice) => {
    // Apply modifier
    const newProbability = Math.max(0, Math.min(1, survivalProbability + choice.modifier));
    setSurvivalProbability(newProbability);
    
    // Record decision
    const decision = {
      ...choice,
      time: currentEvent.time,
      newProbability: newProbability
    };
    setDecisions(prev => [...prev, decision]);
    
    addLog('decision', `Decision: ${choice.text}`);
    addLog('info', `Survival probability: ${(newProbability * 100).toFixed(1)}% ${choice.modifier > 0 ? '⬆️' : '⬇️'}`);
    
    // Advance to next event
    advanceEvent();
  };

  const advanceEvent = () => {
    const currentIndex = timeline.findIndex(e => e.id === currentEvent?.id);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= timeline.length) {
      // Simulation complete
      const finalSurvived = survivalProbability > 0.5;
      setSurvived(finalSurvived);
      setIsComplete(true);
      setIsRunning(false);
      
      addLog('result', finalSurvived ? '🎉 You survived the Titanic disaster!' : '💔 You did not survive.');
      addLog('info', `Final survival probability: ${(survivalProbability * 100).toFixed(1)}%`);
      
      if (onComplete) {
        onComplete({ survived: finalSurvived, probability: survivalProbability, decisions });
      }
      
      return;
    }
    
    const nextEvent = timeline[nextIndex];
    setCurrentEvent(nextEvent);
    addLog('info', `⏰ ${nextEvent.time} - ${nextEvent.event}`);
    addLog('info', nextEvent.description);
  };

  const addLog = (type, message) => {
    setLogs(prev => [...prev, {
      type,
      message,
      timestamp: new Date()
    }]);
  };

  const getProbabilityColor = (prob) => {
    if (prob > 0.6) return 'text-green-500';
    if (prob > 0.4) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProbabilityBackground = (prob) => {
    if (prob > 0.6) return 'bg-green-500';
    if (prob > 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`bg-gray-900 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
            <Ship size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Emergency Simulation</h3>
            <p className="text-gray-400 text-sm">Titanic Disaster Timeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              {isPaused ? (
                <button
                  onClick={resumeSimulation}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm flex items-center gap-1"
                >
                  <Play size={16} />
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseSimulation}
                  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm flex items-center gap-1"
                >
                  <Pause size={16} />
                  Pause
                </button>
              )}
              <button
                onClick={resetSimulation}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm flex items-center gap-1"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </>
          ) : (
            <button
              onClick={startSimulation}
              disabled={isComplete}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-medium flex items-center gap-1"
            >
              <Play size={16} />
              Start Simulation
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-3 gap-0">
        {/* Left: Simulation Console */}
        <div className="md:col-span-2 p-6">
          {/* Status Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-300">
                  {currentEvent?.time || 'Not started'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Survival:</span>
                <span className={`font-bold ${getProbabilityColor(survivalProbability)}`}>
                  {(survivalProbability * 100).toFixed(1)}%
                </span>
              </div>
              {isRunning && !isPaused && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-500 text-sm">Active</span>
                </div>
              )}
              {isPaused && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span className="text-yellow-500 text-sm">Paused</span>
                </div>
              )}
              {isComplete && (
                <div className="flex items-center gap-1">
                  <span className="text-white text-sm font-medium">
                    {survived ? '✅ SURVIVED' : '❌ PERISHED'}
                  </span>
                </div>
              )}
            </div>
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${getProbabilityBackground(survivalProbability)}`}
                initial={{ width: `${initialProbability * 100}%` }}
                animate={{ width: `${survivalProbability * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Event Display */}
          {currentEvent && (
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-4 mb-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={20} className="text-red-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium">{currentEvent.event}</h4>
                  <p className="text-gray-400 text-sm mt-1">{currentEvent.description}</p>
                </div>
              </div>

              {/* Choices */}
              {currentEvent.choices && !isComplete && (
                <div className="mt-4 space-y-2">
                  <p className="text-gray-400 text-sm mb-2">Choose your action:</p>
                  {currentEvent.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => makeDecision(choice)}
                      disabled={isPaused}
                      className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center justify-between ${
                        isPaused
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{choice.text}</span>
                        <p className="text-xs text-gray-400">{choice.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${choice.modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {choice.modifier > 0 ? '+' : ''}{choice.modifier * 100}%
                        </span>
                        <ChevronRight size={16} className="text-gray-500" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Logs */}
          <div className="bg-gray-800 rounded-lg p-3 h-40 overflow-y-auto">
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`text-sm ${
                    log.type === 'decision'
                      ? 'text-blue-400'
                      : log.type === 'result'
                      ? 'text-yellow-400 font-medium'
                      : 'text-gray-400'
                  }`}
                >
                  <span className="text-gray-600 text-xs">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  {' '}
                  {log.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Right: Stats Panel */}
        <div className="bg-gray-800/50 p-6 border-l border-gray-700">
          <h4 className="text-white font-medium mb-4">Decision History</h4>
          
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {decisions.length === 0 ? (
              <p className="text-gray-500 text-sm">No decisions made yet</p>
            ) : (
              decisions.map((decision, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">{decision.text}</span>
                    <span className={`text-xs font-medium ${
                      decision.modifier > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {decision.modifier > 0 ? '+' : ''}{decision.modifier * 100}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-400 text-xs">{decision.time}</span>
                    <span className="text-xs text-gray-400">
                      {((decision.newProbability || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Stats */}
          {isComplete && (
            <div className="mt-4 p-3 rounded-lg bg-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Outcome</span>
                <span className={`font-bold ${survived ? 'text-green-400' : 'text-red-400'}`}>
                  {survived ? 'SURVIVED' : 'PERISHED'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-300 text-sm">Final Probability</span>
                <span className="text-white font-bold">
                  {(survivalProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-300 text-sm">Decisions Made</span>
                <span className="text-white">{decisions.length}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}