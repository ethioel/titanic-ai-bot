'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ship, 
  Brain, 
  Clock, 
  Users, 
  Sparkles, 
  Menu, 
  X, 
  ChevronRight,
  Github,
  Twitter,
  Linkedin,
  Heart,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react';
import { useTheme } from './components/ThemeProvider';
import ThemeToggle from './components/ThemeToggle';
import ChatInterface from './components/ChatInterface';
import PassengerForm from './components/PassengerForm';
import SimulationConsole from './components/SimulationConsole';
import HistoricalTwin from './components/HistoricalTwin';
import PredictionCard from './components/PredictionCard';
import LoadingSpinner from './components/LoadingSpinner';

const tabs = [
  { id: 'chat', label: 'Chat', icon: '💬', desc: 'Talk to the AI' },
  { id: 'predict', label: 'Predict', icon: '🔮', desc: 'Survival analysis' },
  { id: 'twin', label: 'Twin', icon: '👥', desc: 'Historical match' },
  { id: 'simulate', label: 'Simulate', icon: '🚨', desc: 'Emergency timeline' },
];

const stats = [
  { icon: Users, label: '1,309', desc: 'Passengers', color: 'text-blue-500' },
  { icon: Shield, label: '38.4%', desc: 'Survival rate', color: 'text-emerald-500' },
  { icon: Brain, label: 'SHAP', desc: 'Explainable AI', color: 'text-violet-500' },
  { icon: Clock, label: '2h 40m', desc: 'Full simulation', color: 'text-amber-500' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const [passengerData, setPassengerData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [twin, setTwin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  const handlePredict = useCallback(async () => {
    if (!passengerData) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bot/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passengerData),
      });
      const data = await res.json();
      setPrediction(data.data || data);
      setActiveTab('results');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [passengerData]);

  const handleFindTwin = useCallback(async () => {
    if (!passengerData) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bot/twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passenger: passengerData }),
      });
      const data = await res.json();
      setTwin(data.data || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [passengerData]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 overflow-x-hidden">
      {/* Animated background mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 dark:from-blue-500/10 dark:to-violet-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/5 via-transparent to-cyan-500/5 dark:from-indigo-500/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Ship size={18} className="text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-background" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold tracking-tight text-foreground">Titanic AI</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Survival Engine</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-secondary rounded-lg"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <span>{tab.icon}</span>
                    {tab.label}
                  </span>
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 rounded-xl glass flex items-center justify-center"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border/50 overflow-hidden"
            >
              <div className="px-4 py-3 grid grid-cols-2 gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="text-center mb-12 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-500/20 mb-4">
              <Sparkles size={12} />
              Powered by Stacking Ensemble ML
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance">
              Would You Have <br />
              <span className="text-gradient">Survived the Titanic?</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              Enter your details and our AI predicts your survival probability, finds your historical twin, and immerses you in the sinking.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mt-8"
          >
            {stats.map((stat, i) => (
              <div key={i} className="glass rounded-2xl p-4 card-hover">
                <stat.icon size={20} className={`mx-auto mb-2 ${stat.color}`} />
                <div className="text-xl font-bold text-foreground">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              <ChatInterface />
            </motion.div>
          )}

          {/* PREDICT TAB */}
          {activeTab === 'predict' && (
            <motion.div
              key="predict"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid lg:grid-cols-5 gap-6 max-w-5xl mx-auto"
            >
              <div className="lg:col-span-3">
                <div className="glass-strong rounded-2xl p-6">
                  <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                    <Brain size={20} className="text-blue-500" />
                    Passenger Profile
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Build your persona for the AI analysis.
                  </p>
                  <PassengerForm onComplete={setPassengerData} />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                {passengerData ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-strong rounded-2xl p-6"
                  >
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Users size={16} className="text-blue-500" />
                      Your Profile
                    </h3>
                    <div className="space-y-3">
                      {[
                        ['Name', passengerData.name || 'Anonymous'],
                        ['Gender', passengerData.Sex?.charAt(0).toUpperCase() + passengerData.Sex?.slice(1)],
                        ['Age', passengerData.Age],
                        ['Class', ['', '1st Class', '2nd Class', '3rd Class'][passengerData.Pclass]],
                        ['Port', { S: 'Southampton', C: 'Cherbourg', Q: 'Queenstown' }[passengerData.Embarked]],
                        ['Fare', `£${passengerData.Fare}`],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                          <span className="text-sm text-muted-foreground">{k}</span>
                          <span className="text-sm font-semibold">{v}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handlePredict}
                      disabled={loading}
                      className="btn-primary w-full mt-6"
                    >
                      {loading ? <LoadingSpinner size="sm" /> : (
                        <>
                          <Zap size={16} />
                          Run Prediction
                        </>
                      )}
                    </button>
                  </motion.div>
                ) : (
                  <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
                    <Brain size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Fill the form to see your profile and run the prediction.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* RESULTS TAB */}
          {activeTab === 'results' && prediction && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              <PredictionCard
                prediction={prediction}
                onShare={() => {
                  const text = `I ${prediction.survived ? 'survived' : 'perished'} the Titanic with ${(prediction.probability * 100).toFixed(1)}% survival probability — Titanic AI`;
                  navigator.clipboard.writeText(text);
                }}
              />
              <div className="mt-6 flex justify-center gap-3">
                <button onClick={() => setActiveTab('twin')} className="btn-secondary">
                  Find Historical Twin
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => setActiveTab('simulate')} className="btn-primary">
                  Start Simulation
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* TWIN TAB */}
          {activeTab === 'twin' && (
            <motion.div
              key="twin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto"
            >
              <div className="glass-strong rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Users size={20} className="text-violet-500" />
                  Find Your Twin
                </h2>
                <PassengerForm onComplete={(data) => { setPassengerData(data); handleFindTwin(); }} compact />
              </div>
              <div>
                <HistoricalTwin 
                  passengerData={passengerData} 
                  twinData={twin}
                  onRefresh={handleFindTwin}
                  loading={loading}
                />
              </div>
            </motion.div>
          )}

          {/* SIMULATE TAB */}
          {activeTab === 'simulate' && (
            <motion.div
              key="simulate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              <SimulationConsole
                passengerData={passengerData}
                initialProbability={prediction?.probability || 0.5}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>© 2026 Titanic AI</span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline whitespace-nowrap text-xs text-gray-500">
  <span>Built with</span>
  <Heart size={12} className="text-red-500 fill-red-500 inline-block align-middle ml-1.5" />
  <span className="ml-1.5">love by Samuel.K</span>
</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/ethioel"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="https://www.linkedin.com/in/samuel-kahsay"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="https://twitter.com/ethioel"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="X / Twitter"
              >
                <Twitter size={18} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
