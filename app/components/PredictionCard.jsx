'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  Info,
  Share2,
  Users,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function PredictionCard({ 
  prediction, 
  explanations = [],
  counterfactuals = [],
  onShare,
  className = '' 
}) {
  const [showExplanations, setShowExplanations] = useState(false);
  const [showCounterfactuals, setShowCounterfactuals] = useState(false);

  const { 
    survived, 
    probability, 
    confidence, 
    feature_importance = {} 
  } = prediction || {};

  if (!prediction) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-8 text-center ${className}`}>
        <div className="text-5xl mb-4">🔮</div>
        <h3 className="text-lg font-semibold text-gray-700">Ready for Prediction</h3>
        <p className="text-gray-500 text-sm mt-1">
          Complete your passenger profile to see your survival prediction.
        </p>
      </div>
    );
  }

  const getColorClass = (survived) => {
    return survived ? 'text-green-500' : 'text-red-500';
  };

  const getBgColorClass = (survived) => {
    return survived ? 'bg-green-500' : 'bg-red-500';
  };

  const getIcon = (survived) => {
    return survived ? <CheckCircle size={48} /> : <XCircle size={48} />;
  };

  const getProbabilityColor = (prob) => {
    if (prob > 0.6) return 'text-green-500';
    if (prob > 0.4) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceLabel = (conf) => {
    if (conf > 0.7) return 'High Confidence';
    if (conf > 0.4) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`px-6 py-4 ${
        survived ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={survived ? 'text-green-500' : 'text-red-500'}>
              {getIcon(survived)}
            </div>
            <div>
              <h3 className={`text-xl font-bold ${getColorClass(survived)}`}>
                {survived ? 'You Would Survive!' : 'You Would Not Survive'}
              </h3>
              <p className="text-sm text-gray-600">
                Based on your passenger profile
              </p>
            </div>
          </div>
          <button
            onClick={onShare}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm transition-colors flex items-center gap-1"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-500">Probability</div>
            <div className={`text-3xl font-bold ${getProbabilityColor(probability)}`}>
              {(probability * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Confidence</div>
            <div className="text-3xl font-bold text-gray-800">
              {(confidence * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">{getConfidenceLabel(confidence)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Outcome</div>
            <div className={`text-2xl font-bold ${getColorClass(survived)}`}>
              {survived ? '✅ Survive' : '❌ Perish'}
            </div>
          </div>
        </div>

        {/* Probability Bar */}
        <div className="mt-4">
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${getBgColorClass(survived)}`}
              initial={{ width: 0 }}
              animate={{ width: `${probability * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Explanations */}
      {explanations && explanations.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => setShowExplanations(!showExplanations)}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info size={18} className="text-blue-500" />
              <span className="font-medium text-gray-700">Key Factors</span>
            </div>
            {showExplanations ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          <AnimatePresence>
            {showExplanations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 pb-4 space-y-2"
              >
                {explanations.map((exp, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-700">{exp.feature}</span>
                      <span className="text-xs text-gray-500 ml-2">({exp.value})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${exp.impact > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {exp.impact > 0 ? '+' : ''}{(exp.impact * 100).toFixed(0)}%
                      </span>
                      {exp.impact > 0 ? (
                        <TrendingUp size={14} className="text-green-500" />
                      ) : (
                        <TrendingDown size={14} className="text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Counterfactuals */}
      {counterfactuals && counterfactuals.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => setShowCounterfactuals(!showCounterfactuals)}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-500" />
              <span className="font-medium text-gray-700">What-If Scenarios</span>
            </div>
            {showCounterfactuals ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          <AnimatePresence>
            {showCounterfactuals && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 pb-4 space-y-2"
              >
                {counterfactuals.map((cf, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      cf.improvement > 0.05
                        ? 'border-green-200 bg-green-50'
                        : cf.improvement < -0.05
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-gray-800">{cf.scenario}</div>
                        <div className="text-xs text-gray-500">{cf.change}</div>
                      </div>
                      <div className={`text-sm font-bold ${
                        cf.improvement > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {cf.improvement > 0 ? '+' : ''}{(cf.improvement * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{cf.description}</div>
                    {cf.recommendation && (
                      <div className="mt-1 text-xs font-medium text-gray-700">
                        {cf.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}