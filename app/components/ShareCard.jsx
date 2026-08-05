'use client';

import { useState } from 'react';

export default function ShareCard({ data }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    const text = `🚢 I survived the Titanic with ${(data.probability * 100).toFixed(0)}% certainty!
    
${data.survived ? '✅ I SURVIVED!' : '❌ I DID NOT SURVIVE.'}

${data.twin ? `My historical twin: ${data.twin.name}` : ''}

Check your own survival odds: [link]`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleShare = () => {
    // Use Web Share API
    if (navigator.share) {
      navigator.share({
        title: 'Titanic Survival Prediction',
        text: `I ${data.survived ? 'survived' : 'did not survive'} the Titanic with ${(data.probability * 100).toFixed(0)}% certainty!`,
        url: window.location.href
      });
    } else {
      handleCopy();
    }
  };
  
  const survivalColor = data.survived ? 'green' : 'red';
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">📊 Share Your Survival Prediction</h3>
      </div>
      
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-4">
        <div className="text-center">
          <div className="text-5xl mb-2">{data.survived ? '✅' : '❌'}</div>
          <div className="text-2xl font-bold mb-2">
            {data.survived ? 'YOU SURVIVED!' : 'YOU DID NOT SURVIVE'}
          </div>
          <div className="text-lg">
            Survival Probability: {(data.probability * 100).toFixed(1)}%
          </div>
          {data.twin && (
            <div className="text-sm mt-2 opacity-80">
              Historical Twin: {data.twin.name}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex space-x-3">
        <button
          onClick={handleShare}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          📤 Share
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
      </div>
    </div>
  );
}