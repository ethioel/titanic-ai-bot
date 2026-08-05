'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Share2,
  Users,
  Ship,
  LifeBuoy,
  Sparkles
} from 'lucide-react';

const SESSION_KEY = 'titanic_session';

export default function ChatInterface() {
  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [passengerData, setPassengerData] = useState({});
  const [step, setStep] = useState('welcome');
  const [prediction, setPrediction] = useState(null);
  const [simulationActive, setSimulationActive] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [typing, setTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize chat session
  useEffect(() => {
    let session = localStorage.getItem(SESSION_KEY);
    if (!session) {
      session = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(SESSION_KEY, session);
    }
    setSessionId(session);
    
    // Welcome message
    const welcomeMessages = [
      {
        id: 'welcome',
        type: 'bot',
        content: `🚢 Welcome aboard the RMS Titanic, passenger!

I am your historical guide and survival analyst. I'll help you understand your chances of survival through an immersive interactive experience.

We'll start with your passenger registration, then I'll analyze your profile, find your historical twin, and run a real-time emergency simulation.

Shall we begin?`,
        timestamp: new Date()
      },
      {
        id: 'name_prompt',
        type: 'bot',
        content: "What is your name, passenger? (Or type 'skip' to remain anonymous)",
        timestamp: new Date()
      }
    ];
    
    setMessages(welcomeMessages);
    inputRef.current?.focus();
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message sending
  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    
    const userMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: text.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setTyping(true);
    
    try {
      const response = await axios.post('/api/bot/interview', {
        session_id: sessionId,
        message: text.trim(),
        step: step,
        passenger_data: passengerData
      });
      
      const data = response.data;
      
      // Update state
      if (data.passenger_data) {
        setPassengerData(data.passenger_data);
      }
      
      if (data.step) {
        setStep(data.step);
      }
      
      if (data.prediction) {
        setPrediction(data.prediction);
      }
      
      // Add bot response with animation delay
      setTimeout(() => {
        setTyping(false);
        setMessages(prev => [...prev, {
          id: `bot_${Date.now()}`,
          type: 'bot',
          content: data.message,
          timestamp: new Date(),
          actions: data.actions,
          prediction: data.prediction,
          twin: data.twin,
          simulation: data.simulation
        }]);
      }, 500);
      
      // Handle special actions
      if (data.action === 'show_twin') {
        await fetchHistoricalTwin();
      }
      
      if (data.action === 'start_simulation') {
        startSimulation();
      }
      
      if (data.action === 'show_prediction') {
        setShowShare(true);
      }
      
    } catch (error) {
      setTyping(false);
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        type: 'error',
        content: '⚠️ I encountered an issue. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch historical twin
  const fetchHistoricalTwin = async () => {
    try {
      const response = await axios.post('/api/bot/twin', {
        passenger_data: passengerData
      });
      
      setMessages(prev => [...prev, {
        id: `twin_${Date.now()}`,
        type: 'twin',
        content: '👥 I found your historical twin!',
        twin: response.data,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error fetching twin:', error);
    }
  };

  // Start simulation
  const startSimulation = async () => {
    try {
      const response = await axios.post('/api/bot/simulate', {
        passenger_data: passengerData,
        start: true,
        initial_probability: prediction?.probability || 0.5
      });
      
      setSimulationActive(true);
      setMessages(prev => [...prev, {
        id: `sim_${Date.now()}`,
        type: 'simulation',
        content: '🚨 Emergency Simulation Starting...',
        simulation: response.data,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error starting simulation:', error);
    }
  };

  // Handle simulation decision
  const handleSimulationDecision = async (decisionId) => {
    try {
      const response = await axios.post('/api/bot/simulate', {
        decision_id: decisionId,
        session_id: sessionId
      });
      
      const data = response.data;
      
      setMessages(prev => [...prev, {
        id: `sim_update_${Date.now()}`,
        type: 'simulation_update',
        content: data.message,
        simulation: data,
        timestamp: new Date()
      }]);
      
      if (data.complete) {
        setSimulationActive(false);
        setShowShare(true);
      }
    } catch (error) {
      console.error('Error processing decision:', error);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Render message
  const renderMessage = (msg) => {
    const isUser = msg.type === 'user';
    const isBot = msg.type === 'bot';
    const isError = msg.type === 'error';
    const isTwin = msg.type === 'twin';
    const isSimulation = msg.type === 'simulation' || msg.type === 'simulation_update';
    
    if (isUser) {
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start space-x-2 justify-end mb-4"
        >
          <div className="bg-blue-600 rounded-lg px-4 py-3 max-w-3xl shadow-sm">
            <p className="whitespace-pre-wrap text-white text-sm">{msg.content}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
            <User size={16} />
          </div>
        </motion.div>
      );
    }
    
    if (isBot) {
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start space-x-2 mb-4"
        >
          <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
            <Bot size={16} />
          </div>
          <div className="bg-white rounded-lg px-4 py-3 max-w-3xl shadow-sm border border-gray-100">
            <p className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
              {msg.content}
            </p>
            {msg.actions && (
              <div className="mt-3 flex flex-wrap gap-2">
                {msg.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      if (action.id === 'start_simulation') {
                        startSimulation();
                      } else if (action.id === 'show_twin') {
                        fetchHistoricalTwin();
                      } else {
                        sendMessage(action.text);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {action.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      );
    }
    
    if (isTwin && msg.twin) {
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start space-x-2 mb-4"
        >
          <div className="w-8 h-8 rounded-full bg-purple-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
            <Users size={16} />
          </div>
          <div className="bg-purple-50 rounded-lg px-4 py-3 max-w-3xl border border-purple-200 shadow-sm">
            <div className="font-semibold text-purple-800 mb-2">👤 Your Historical Twin</div>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.twin.narrative}</p>
            {msg.twin.top_matches && (
              <div className="mt-3">
                <div className="text-xs font-medium text-gray-500 mb-1">Other close matches:</div>
                {msg.twin.top_matches.slice(1, 3).map((match, i) => (
                  <div key={i} className="text-xs text-gray-600 flex items-center space-x-1">
                    <span>•</span>
                    <span>{match.name}</span>
                    <span className="text-gray-400">({(match.similarity * 100).toFixed(0)}% match)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      );
    }
    
    if (isSimulation && msg.simulation) {
      const sim = msg.simulation;
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start space-x-2 mb-4"
        >
          <div className="w-8 h-8 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold animate-pulse">
            <AlertCircle size={16} />
          </div>
          <div className="bg-red-50 rounded-lg px-4 py-3 max-w-3xl border border-red-200 shadow-sm">
            <div className="font-semibold text-red-800 mb-2">🚨 Emergency Simulation</div>
            <div className="text-sm text-gray-700 space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {sim.current_time || '11:40 PM'}
                </span>
                <span className={`font-bold ${sim.survival_probability > 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                  Survival: {(sim.survival_probability * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-2">{sim.message}</p>
              {sim.next_event && sim.next_event.choices && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium text-gray-500">Choose your action:</div>
                  {sim.next_event.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => handleSimulationDecision(choice.id)}
                      className="block w-full text-left px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                    >
                      {choice.text}
                    </button>
                  ))}
                </div>
              )}
              {sim.complete && (
                <div className={`mt-3 p-3 rounded-lg ${sim.survived ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {sim.survived ? (
                    <div className="flex items-center gap-2">
                      <LifeBuoy size={20} />
                      <span>🎉 You survived! Your choices saved your life.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle size={20} />
                      <span>💔 You did not survive. Your choices determined your fate.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      );
    }
    
    if (isError) {
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start space-x-2 mb-4"
        >
          <div className="w-8 h-8 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
            <AlertCircle size={16} />
          </div>
          <div className="bg-red-50 rounded-lg px-4 py-3 border border-red-200 text-red-700 text-sm">
            {msg.content}
          </div>
        </motion.div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex flex-col h-[700px] bg-gray-50 rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Ship size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold">Titanic AI Assistant</h1>
              <p className="text-sm opacity-80">Interactive Survival Predictor</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {prediction && (
              <button
                onClick={() => setShowShare(!showShare)}
                className="px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-xs flex items-center gap-1"
              >
                <Share2 size={14} />
                Share
              </button>
            )}
            {simulationActive && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 rounded-lg text-xs font-bold animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                SIMULATION
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-gray-50 to-white">
        <AnimatePresence>
          {messages.map((msg) => renderMessage(msg))}
        </AnimatePresence>
        {typing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start space-x-2 mb-4"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white">
              <Bot size={16} />
            </div>
            <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-400 text-center">
          {step === 'welcome' && '🚢 Introduce yourself to begin'}
          {step === 'interview' && '📝 Answer questions about your passenger profile'}
          {step === 'complete' && '🎯 Prediction ready! Ask "what if" for alternatives'}
          {simulationActive && '🚨 Emergency simulation in progress...'}
        </div>
      </div>
    </div>
  );
}