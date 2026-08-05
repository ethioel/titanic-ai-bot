'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  User, 
  Calendar, 
  Ship, 
  MapPin,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Heart,
  Compass
} from 'lucide-react';

export default function HistoricalTwin({ 
  passengerData, 
  onSelect,
  className = '' 
}) {
  const [twin, setTwin] = useState(null);
  const [topMatches, setTopMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    if (passengerData && Object.keys(passengerData).length > 0) {
      findTwin(passengerData);
    }
  }, [passengerData]);

  const findTwin = async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/bot/twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passenger_data: data })
      });

      if (!response.ok) {
        throw new Error('Failed to find twin');
      }

      const result = await response.json();
      setTwin(result.twin);
      setTopMatches(result.top_matches || []);
      setSelectedMatch(result.twin);
      
      if (onSelect) {
        onSelect(result.twin);
      }
    } catch (err) {
      setError(err.message);
      // Fallback data
      setTwin({
        name: 'Rose DeWitt Bukater',
        age: 17,
        gender: 'female',
        class: 1,
        survived: true,
        similarity: 0.72,
        bio: 'Fictional first-class passenger known for her courage and determination during the sinking.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (similarity) => {
    if (similarity > 0.7) return 'text-green-500';
    if (similarity > 0.4) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getClassLabel = (cls) => {
    return ['', '1st Class', '2nd Class', '3rd Class'][cls] || 'Unknown';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-8 text-center ${className}`}>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-500">Searching for your historical twin...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="text-red-500 text-center">
          <p>⚠️ {error}</p>
          <button
            onClick={() => findTwin(passengerData)}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!twin) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 text-center ${className}`}>
        <Users size={48} className="mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-semibold text-gray-700">Find Your Historical Twin</h3>
        <p className="text-gray-500 text-sm mt-1">
          Complete your passenger profile to find your doppelganger from the Titanic manifest.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Your Historical Twin</h3>
            <p className="text-purple-200 text-sm">Found on the RMS Titanic manifest</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Twin Card */}
          <div className="flex-1">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-800">{twin.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">
                      {twin.age} years old
                    </span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full" />
                    <span className="text-sm text-gray-600 capitalize">{twin.gender}</span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full" />
                    <span className="text-sm text-gray-600">{getClassLabel(twin.class)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Match</div>
                  <div className={`text-2xl font-bold ${getSimilarityColor(twin.similarity)}`}>
                    {(twin.similarity * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Survival Status */}
              <div className="mt-3 flex items-center gap-2">
                {twin.survived ? (
                  <>
                    <CheckCircle size={18} className="text-green-500" />
                    <span className="text-green-600 font-medium">Survived the disaster</span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-red-500" />
                    <span className="text-red-600 font-medium">Did not survive</span>
                  </>
                )}
              </div>

              {/* Bio */}
              {twin.bio && (
                <div className="mt-3 p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600">{twin.bio}</p>
                </div>
              )}
            </div>

            {/* Similarity Details */}
            {twin.match_details && twin.match_details.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Why you match:</span> {twin.match_details.join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Top Matches */}
          {topMatches.length > 1 && (
            <div className="md:w-64">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Other Matches</h5>
              <div className="space-y-2">
                {topMatches.slice(1, 4).map((match, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedMatch(match);
                      if (onSelect) onSelect(match);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedMatch?.name === match.name
                        ? 'bg-purple-100 border-2 border-purple-300'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{match.name}</div>
                        <div className="text-xs text-gray-500">
                          {match.age} yrs · {getClassLabel(match.class)}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-gray-500">
                        {(match.similarity * 100).toFixed(0)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Narrative */}
        {twin.narrative && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <Sparkles size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {twin.narrative}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => findTwin(passengerData)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Compass size={18} />
            Find Another
          </button>
          {twin.survived && (
            <button
              onClick={() => {
                if (onSelect) onSelect({ ...twin, action: 'learn_more' });
              }}
              className="px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              <Heart size={18} />
              Learn Their Story
            </button>
          )}
        </div>
      </div>
    </div>
  );
}