'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, Loader2, AlertCircle, Sparkles, 
  LifeBuoy, Waves, RotateCcw, ChevronRight
} from 'lucide-react';

const SESSION_KEY = 'titanic_session_v2';

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [passengerData, setPassengerData] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [simProbability, setSimProbability] = useState(null);
  const [simState, setSimState] = useState(null);
  const [typing, setTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Init Session ──
  useEffect(() => {
    let session = localStorage.getItem(SESSION_KEY);
    if (!session) {
      session = `titanic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem(SESSION_KEY, session);
    }
    setSessionId(session);

    setMessages([{
      id: 'welcome',
      type: 'bot',
      content: "🚢 **Welcome aboard the RMS Titanic.**\n\nI am your AI Survival Analyst. Please **type your name** below to begin your passenger registration.",
      timestamp: new Date(),
      actions: []
    }]);

    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  // ── Auto-resize textarea ──
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  // ── Send Handler ──
  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading || !sessionId) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTyping(true);

    try {
      const { data } = await axios.post('/api/bot/interview', {
        session_id: sessionId,
        message: text,
        passenger_data: passengerData
      });

      if (data.passenger_data) setPassengerData(data.passenger_data);
      if (data.prediction) setPrediction(data.prediction);

      setTimeout(() => {
        setTyping(false);
        setMessages(prev => [...prev, {
          id: `bot_${Date.now()}`,
          type: 'bot',
          content: data.message,
          timestamp: new Date(),
          actions: data.actions || [],
          prediction: data.prediction,
          action: data.action
        }]);

        // ── FIX: Pass fresh passenger_data directly, avoid stale closure ──
        if (data.action === 'show_twin') fetchTwin(data.passenger_data);
        if (data.action === 'start_simulation') {
          const baseProb = data.prediction?.probability || 0.5;
          setSimProbability(baseProb);
          startSimulation(baseProb);
        }
      }, 600);

    } catch (err) {
      setTyping(false);
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        type: 'error',
        content: '⚠️ **Connection lost with the bridge.** Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, sessionId, passengerData]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── FIX: fetchTwin accepts explicit data to avoid stale state ──
  const fetchTwin = async (explicitData) => {
    const payload = explicitData || passengerData;
    
    // Defensive: if we have nothing, show error immediately
    if (!payload || Object.keys(payload).length === 0) {
      setMessages(prev => [...prev, {
        id: `twin_err_${Date.now()}`,
        type: 'error',
        content: '⚠️ No passenger data found. Please complete your profile first.',
        timestamp: new Date()
      }]);
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post('/api/bot/twin', {
        session_id: sessionId,
        passenger_data: payload
      });
      
      // Defensive: if API returns error field
      if (data.error) throw new Error(data.error);
      
      const narrative = data.narrative || 'No historical match found.';
      
      setMessages(prev => [...prev, {
        id: `twin_${Date.now()}`,
        type: 'twin',
        content: narrative,
        twin: data,
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error('Twin fetch error:', err);
      setMessages(prev => [...prev, {
        id: `twin_err_${Date.now()}`,
        type: 'error',
        content: `⚠️ Archive search failed: ${err.response?.data?.error || err.message || 'Unknown error'}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startSimulation = async (baseProb) => {
    try {
      setLoading(true);
      const { data } = await axios.post('/api/bot/simulate', {
        session_id: sessionId,
        passenger_data: passengerData,
        start: true,
        initial_probability: baseProb
      });
      
      if (data.state) setSimState(data.state);
      
      setMessages(prev => [...prev, {
        id: `sim_${Date.now()}`,
        type: 'simulation',
        content: data.message,
        simulation: data,
        timestamp: new Date()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `sim_err_${Date.now()}`,
        type: 'error',
        content: '⚠️ Simulation engine failure.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSimChoice = async (decisionId) => {
    if (!simState) {
      setMessages(prev => [...prev, {
        id: `sim_err_${Date.now()}`,
        type: 'error',
        content: '⚠️ Simulation state lost. Please restart.',
        timestamp: new Date()
      }]);
      return;
    }

    try {
      setLoading(true);
      const currentProb = simProbability !== null ? simProbability : (prediction?.probability || 0.5);
      
      const { data } = await axios.post('/api/bot/simulate', {
        session_id: sessionId,
        decision_id: decisionId,
        state: simState,
        current_probability: currentProb
      });
      
      if (data.state) setSimState(data.state);
      if (data.survival_probability !== undefined) setSimProbability(data.survival_probability);
      
      setMessages(prev => [...prev, {
        id: `sim_${Date.now()}`,
        type: data.complete ? 'sim_result' : 'simulation',
        content: data.message,
        simulation: data,
        timestamp: new Date()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `sim_err_${Date.now()}`,
        type: 'error',
        content: '⚠️ Decision processing failed.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    if (action.id === 'show_twin') fetchTwin(passengerData);
    else if (action.id === 'start_simulation') {
      const baseProb = prediction?.probability || 0.5;
      setSimProbability(baseProb);
      startSimulation(baseProb);
    }
    else if (action.id === 'reset') handleSend('reset');
    else if (action.id.startsWith('class_')) handleSend(action.id.replace('class_', ''));
    else if (action.id.startsWith('sex_')) handleSend(action.id.replace('sex_', ''));
    else if (action.id.startsWith('embark_')) handleSend(action.id.replace('embark_', ''));
    else if (action.id.startsWith('fam_')) handleSend(action.id.replace('fam_', ''));
    else handleSend(action.text);
  };

  // ── Helpers ──
  const fmtTime = (d) => new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit'
  }).format(d);

  const renderText = (text) => {
    if (!text) return <span className="italic text-slate-400">No content</span>;
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/);
      return (
        <p key={i} className="mb-0.5 last:mb-0">
          {parts.map((part, j) => 
            part.startsWith('**') && part.endsWith('**') ? (
              <span key={j} className="font-bold text-slate-900 dark:text-white">
                {part.slice(2, -2)}
              </span>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      );
    });
  };

  const avatarConfig = {
    user: { bg: 'bg-slate-700 dark:bg-slate-600', icon: <User size={16} /> },
    error: { bg: 'bg-red-500', icon: <AlertCircle size={16} /> },
    twin: { bg: 'bg-purple-500', icon: <Sparkles size={16} /> },
    simulation: { bg: 'bg-amber-500', icon: <Waves size={16} /> },
    sim_result: { bg: 'bg-green-500', icon: <LifeBuoy size={16} /> },
    bot: { bg: 'bg-blue-600 dark:bg-blue-500', icon: <Bot size={16} /> }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      
      {/* ═══ NO HEADER ═══ */}
      
      {/* ═══ MESSAGES ═══ */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const cfg = avatarConfig[msg.type] || avatarConfig.bot;
            const isUser = msg.type === 'user';
            
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-md text-white ${cfg.bg}`}>
                  {cfg.icon}
                </div>

                <div className={`max-w-[82%] md:max-w-[65%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`relative px-5 py-3.5 rounded-2xl shadow-sm ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : msg.type === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-bl-md'
                      : msg.type === 'twin'
                      ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-800 rounded-bl-md'
                      : msg.type === 'simulation'
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800 rounded-bl-md'
                      : msg.type === 'sim_result'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-800 rounded-bl-md'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md'
                  }`}>
                    
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {renderText(msg.content)}
                    </div>

                    {/* Prediction Meter */}
                    {msg.prediction && (
                      <div className="mt-4 p-4 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Survival Probability
                          </span>
                          <span className={`text-xl font-black ${
                            msg.prediction.probability > 0.6 
                              ? 'text-green-600 dark:text-green-400' 
                              : msg.prediction.probability > 0.3
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {(msg.prediction.probability * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${msg.prediction.probability * 100}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              msg.prediction.probability > 0.6 
                                ? 'bg-green-500' 
                                : msg.prediction.probability > 0.3
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                          />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Verdict: {msg.prediction.verdict?.icon} {msg.prediction.verdict?.label}
                        </p>
                      </div>
                    )}

                    {/* Simulation Choices */}
                    {msg.simulation && !msg.simulation.complete && msg.simulation.current_scenario?.choices && (
                      <div className="mt-4 space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                          Critical Decision
                        </p>
                        {msg.simulation.current_scenario.choices.map((choice) => (
                          <button
                            key={choice.id}
                            onClick={() => handleSimChoice(choice.id)}
                            disabled={loading}
                            className="w-full group text-left px-4 py-3 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700 rounded-xl transition-all hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md disabled:opacity-40"
                          >
                            <div className="flex items-center gap-3">
                              <ChevronRight size={14} className="text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{choice.text}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Simulation Result */}
                    {msg.type === 'sim_result' && (
                      <div className="mt-4 p-5 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                        <div className="text-5xl mb-3 animate-bounce">
                          {msg.simulation?.survived ? '🛟' : '🌊'}
                        </div>
                        <h3 className="font-black text-xl text-slate-900 dark:text-white mb-1">
                          {msg.simulation?.survived ? 'You Survived' : 'You Perished'}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Final survival probability: <span className="font-bold">{(typeof msg.simulation?.survival_probability === 'number' ? msg.simulation.survival_probability * 100 : 0).toFixed(0)}%</span>
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {msg.actions?.length > 0 && !msg.simulation && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {msg.actions.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => handleAction(action)}
                            disabled={loading}
                            className="px-4 py-2.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 rounded-xl transition-all border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 disabled:opacity-40 active:scale-95"
                          >
                            {action.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <span className="text-[10px] text-slate-400 dark:text-slate-600 mt-1 px-1 block">
                    {fmtTime(msg.timestamp)}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Typing Indicator */}
          {typing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-md">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                <div className="flex gap-1.5">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div 
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay }}
                      className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ═══ INPUT ═══ */}
      <div className="px-4 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition-all shadow-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={loading || typing}
              rows={1}
              className="flex-1 bg-transparent border-0 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none focus:outline-none disabled:opacity-50 min-h-[44px]"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading || typing}
              className="flex-shrink-0 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:shadow-none hover:scale-105 active:scale-95 disabled:hover:scale-100"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
