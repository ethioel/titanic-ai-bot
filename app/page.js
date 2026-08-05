'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';   // ← ADDED AnimatePresence
import { 
  Ship, 
  Users, 
  Brain, 
  Clock, 
  Share2,
  Menu,
  X,
  Sparkles,
  Github,
  Twitter,
  Linkedin
} from 'lucide-react';

import ChatInterface from './components/ChatInterface';
import PassengerForm from './components/PassengerForm';
import SimulationConsole from './components/SimulationConsole';
import HistoricalTwin from './components/HistoricalTwin';
import PredictionCard from './components/PredictionCard';
import LoadingSpinner from './components/LoadingSpinner';

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const [passengerData, setPassengerData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [twin, setTwin] = useState(null);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const tabs = [
    { id: 'chat', label: '💬 Chat', icon: '💬' },
    { id: 'predict', label: '🔮 Predict', icon: '🔮' },
    { id: 'twin', label: '👥 Twin', icon: '👥' },
    { id: 'simulate', label: '🚨 Simulate', icon: '🚨' }
  ];

  const handlePassengerComplete = (data) => {
    setPassengerData(data);
    setActiveTab('predict');
  };

  const handlePrediction = (data) => {
    setPrediction(data);
    setActiveTab('results');
  };

  const handleTwinFound = (data) => {
    setTwin(data);
  };

  const handleSimulationComplete = (data) => {
    setSimulationComplete(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center">
                <Ship size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Titanic AI</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Survival Predictor</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{tab.icon}</span>
                    {tab.label}
                  </span>
                </button>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden py-4 border-t border-gray-200"
            >
              <div className="grid grid-cols-2 gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowMobileMenu(false);
                    }}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container-custom section-padding">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Interactive Titanic Survival AI
            </h1>
            <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
              Predict your survival chances, find your historical twin, and experience the emergency simulation.
            </p>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <ChatInterface />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: '👤', label: '1,309 Passengers', desc: 'Historical manifest' },
                    { icon: '📊', label: '38.4%', desc: 'Average survival rate' },
                    { icon: '🧠', label: 'SHAP AI', desc: 'Explainable predictions' },
                    { icon: '⏱️', label: '15 min', desc: 'Emergency simulation' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm p-4 text-center">
                      <div className="text-2xl">{stat.icon}</div>
                      <div className="font-semibold text-gray-800">{stat.label}</div>
                      <div className="text-xs text-gray-500">{stat.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'predict' && (
              <motion.div
                key="predict"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid md:grid-cols-2 gap-6"
              >
                <PassengerForm
                  onComplete={handlePassengerComplete}
                  className="md:col-span-1"
                />
                <div className="md:col-span-1 space-y-6">
                  {passengerData && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <h3 className="font-semibold text-gray-800 mb-3">Your Profile</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Name</span>
                          <span className="font-medium">{passengerData.name || 'Anonymous'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Gender</span>
                          <span className="font-medium capitalize">{passengerData.Sex}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Age</span>
                          <span className="font-medium">{passengerData.Age}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Class</span>
                          <span className="font-medium">{['', '1st', '2nd', '3rd'][passengerData.Pclass]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Embarked</span>
                          <span className="font-medium">{passengerData.Embarked}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Fare</span>
                          <span className="font-medium">£{passengerData.Fare}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {passengerData && (
                    <button
                      onClick={() => {
                        // Trigger prediction
                        setLoading(true);
                        fetch('/api/bot/predict', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(passengerData)
                        })
                        .then(res => res.json())
                        .then(data => {
                          setPrediction(data);
                          handlePrediction(data);
                          setActiveTab('results');
                        })
                        .catch(console.error)
                        .finally(() => setLoading(false));
                      }}
                      disabled={loading}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      {loading ? <LoadingSpinner size="sm" label="" /> : '🔮 Predict Survival'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'results' && prediction && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <PredictionCard
                  prediction={prediction}
                  explanations={prediction.explanations}
                  counterfactuals={prediction.counterfactuals}
                  onShare={() => {
                    // Handle share
                    navigator.clipboard.writeText(
                      `I ${prediction.survived ? 'survived' : 'did not survive'} the Titanic with ${(prediction.probability * 100).toFixed(1)}% certainty!`
                    );
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'twin' && (
              <motion.div
                key="twin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid md:grid-cols-2 gap-6"
              >
                <div className="md:col-span-1">
                  <PassengerForm
                    onComplete={(data) => {
                      setPassengerData(data);
                      // Trigger twin find
                    }}
                  />
                </div>
                <div className="md:col-span-1">
                  <HistoricalTwin
                    passengerData={passengerData}
                    onSelect={handleTwinFound}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'simulate' && (
              <motion.div
                key="simulate"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <SimulationConsole
                  passengerData={passengerData}
                  initialProbability={prediction?.probability || 0.5}
                  onComplete={handleSimulationComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-8">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                © 2024 Titanic AI Bot
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">
                Built with ❤️ using Next.js & AI
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/yourusername/titanic-ai-bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Github size={20} />
              </a>
              <a
                href="https://twitter.com/yourusername"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://linkedin.com/in/yourusername"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
