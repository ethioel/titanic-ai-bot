'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
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
import SurvivalReport from './components/SurvivalReport';
import VoiceNarrator from './components/VoiceNarrator';
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
  const [loading, setLoading] = useState({ predict: false, twin: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  // ── OG Image URL generator ──
  const getShareImageUrl = (pred, pax) => {
    if (!pred) return '/og-image.png';
    const params = new URLSearchParams({
      survived: String(pred.survived),
      prob: String(pred.probability),
      name: pax?.name || 'You',
      ...(pax?.Pclass && { class: String(pax.Pclass) }),
      ...(twin?.name && { twin: twin.name }),
    });
    return `/api/share?${params.toString()}`;
  };

  // ── Prediction ──
  const handlePredict = useCallback(async (explicitData) => {
    const payload = explicitData || passengerData;
    if (!payload) return;

    setLoading(prev => ({ ...prev, predict: true }));
    try {
      const res = await fetch('/api/bot/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Prediction failed');
      setPrediction(data.data || data);
      setActiveTab('results');
    } catch (err) {
      console.error('Predict error:', err);
      alert(err.message);
    } finally {
      setLoading(prev => ({ ...prev, predict: false }));
    }
  }, [passengerData]);

  // ── Twin ──
  const handleFindTwin = useCallback(async (explicitData) => {
    const payload = explicitData || passengerData;
    if (!payload) return;

    setLoading(prev => ({ ...prev, twin: true }));
    try {
      const res = await fetch('/api/bot/twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passenger_data: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Twin search failed');
      setTwin(data.data || data);
    } catch (err) {
      console.error('Twin error:', err);
      alert(err.message);
    } finally {
      setLoading(prev => ({ ...prev, twin: false }));
    }
  }, [passengerData]);

  // ── Build share text ──
  const buildShareText = () => {
    if (!prediction) return '';
    const url = typeof window !== 'undefined' ? window.location.href : 'https://titanic-ai-bot.vercel.app';
    return `🚢 Titanic AI Survival Report\n\n${prediction.survived ? '✅ I SURVIVED!' : '❌ I DID NOT SURVIVE.'}\n📊 Probability: ${(prediction.probability * 100).toFixed(1)}%\n${twin?.name ? `👥 Twin: ${twin.name}` : ''}\n\n${url}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">
      {/* Dynamic OG tags for results */}
      {activeTab === 'results' && prediction && (
        <Head>
          <title>{`${passengerData?.name || 'You'} ${prediction.survived ? 'Survived' : 'Perished'} the Titanic`}</title>
          <meta property="og:title" content={`${passengerData?.name || 'You'} ${prediction.survived ? 'Survived' : 'Perished'} the Titanic`} />
          <meta property="og:description" content={`Survival probability: ${(prediction.probability * 100).toFixed(1)}%`} />
          <meta property="og:image" content={getShareImageUrl(prediction, passengerData)} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:image" content={getShareImageUrl(prediction, passengerData)} />
        </Head>
      )}

      {/* Animated background mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 dark:from-blue-500/10 dark:to-violet-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/5 via-transparent to-cyan-500/5 dark:from-indigo-500/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-amber-500 dark:to-orange-600 flex items-center justify-center shadow-lg">
                <Ship size={18} className="text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Titanic AI</h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Survival Engine</p>
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
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-lg"
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
                className="md:hidden w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300"
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
              className="md:hidden border-t border-slate-200 dark:border-slate-800 overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl"
            >
              <div className="px-4 py-3 grid grid-cols-2 gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
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
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Hero */}
        <div className="text-center mb-10 md:mb-14 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800 mb-4">
              <Sparkles size={12} />
              Powered by Stacking Ensemble ML
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance text-slate-900 dark:text-white">
              Would You Have <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                Survived the Titanic?
              </span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-balance">
              Enter your details and our AI predicts your survival probability, finds your historical twin, and immerses you in the sinking.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mt-6 md:mt-8"
          >
            {stats.map((stat, i) => (
              <div key={i} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-shadow">
                <stat.icon size={20} className={`mx-auto mb-2 ${stat.color}`} />
                <div className="text-xl font-bold text-slate-900 dark:text-white">{stat.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{stat.desc}</div>
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
              className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 max-w-5xl mx-auto"
            >
              <div className="lg:col-span-3">
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6">
                  <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-slate-900 dark:text-white">
                    <Brain size={20} className="text-blue-500" />
                    Passenger Profile
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
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
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6"
                  >
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
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
                        <div key={k} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <span className="text-sm text-slate-500 dark:text-slate-400">{k}</span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{v}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => handlePredict(passengerData)}
                      disabled={loading.predict}
                      className="w-full mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                    >
                      {loading.predict ? <LoadingSpinner size="sm" /> : (
                        <>
                          <Zap size={16} />
                          Run Prediction
                        </>
                      )}
                    </button>
                  </motion.div>
                ) : (
                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400">
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
              className="max-w-3xl mx-auto space-y-6"
            >
              <PredictionCard prediction={prediction} />

              {/* Voice Narrator */}
              <div className="flex justify-center">
                <VoiceNarrator 
                  text={`You ${prediction.survived ? 'survived' : 'did not survive'} the Titanic with ${(prediction.probability * 100).toFixed(1)} percent probability. ${prediction.survived ? 'Congratulations, you made it to a lifeboat.' : 'Unfortunately, the odds were not in your favor.'}`}
                  label="Hear Your Verdict"
                />
              </div>

              {/* Survival Report Card */}
              <SurvivalReport 
                prediction={prediction}
                twin={twin}
                passenger={passengerData}
              />

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button 
                  onClick={() => setActiveTab('twin')} 
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Find Historical Twin
                  <ChevronRight size={16} />
                </button>
                <button 
                  onClick={() => setActiveTab('simulate')} 
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                >
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
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 max-w-5xl mx-auto"
            >
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Users size={20} className="text-violet-500" />
                  Find Your Twin
                </h2>
                <PassengerForm 
                  onComplete={(data) => { setPassengerData(data); handleFindTwin(data); }} 
                />
              </div>
              <div className="space-y-4">
                <HistoricalTwin 
                  passengerData={passengerData} 
                  twinData={twin}
                  onRefresh={() => passengerData && handleFindTwin(passengerData)}
                  loading={loading.twin}
                />

                {/* Voice Narrator for Twin Story */}
                {twin?.narrative && (
                  <div className="flex justify-center pt-2">
                    <VoiceNarrator 
                      text={twin.narrative}
                      label="Hear Their Story"
                    />
                  </div>
                )}
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
                prediction={prediction}
                ready={!!passengerData}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800 mt-16 md:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>© 2026 Titanic AI</span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline whitespace-nowrap text-xs">
                <span>Built with</span>
                <Heart size={12} className="text-red-500 fill-red-500 inline-block align-middle ml-1.5" />
                <span className="ml-1.5">love by Samuel.K</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://github.com/ethioel" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="GitHub">
                <Github size={18} />
              </a>
              <a href="https://www.linkedin.com/in/samuel-kahsay" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="LinkedIn">
                <Linkedin size={18} />
              </a>
              <a href="https://twitter.com/ethioel" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="X / Twitter">
                <Twitter size={18} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
