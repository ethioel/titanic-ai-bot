'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Users, 
  DollarSign, 
  Ship, 
  MapPin, 
  Calendar, 
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const STEPS = [
  { id: 'name', label: 'Name', icon: User },
  { id: 'gender', label: 'Gender', icon: User },
  { id: 'age', label: 'Age', icon: Calendar },
  { id: 'class', label: 'Class', icon: Ship },
  { id: 'embarked', label: 'Port', icon: MapPin },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'fare', label: 'Fare', icon: DollarSign },
];

export default function PassengerForm({ 
  onComplete, 
  initialData = {}, 
  className = '' 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    Sex: 'male',
    Age: 30,
    Pclass: 3,
    Embarked: 'S',
    SibSp: 0,
    Parch: 0,
    Fare: 32,
    ...initialData
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const currentStepData = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const validateStep = () => {
    const newErrors = {};
    const step = STEPS[currentStep].id;

    switch(step) {
      case 'name':
        if (!formData.name.trim()) {
          newErrors.name = 'Please enter your name';
        }
        break;
      case 'age':
        if (formData.Age < 0 || formData.Age > 120) {
          newErrors.Age = 'Please enter a valid age (0-120)';
        }
        break;
      case 'fare':
        if (formData.Fare < 0) {
          newErrors.Fare = 'Please enter a valid fare amount';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete?.(formData);
      setIsComplete(true);
    } catch (error) {
      console.error('Submission error:', error);
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderStep = () => {
    const step = STEPS[currentStep].id;

    switch(step) {
      case 'name':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              What is your name?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This will be used to personalize your experience.
            </p>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 
                         text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>
        );

      case 'gender':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              What is your gender?
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {['male', 'female'].map((gender) => (
                <button
                  key={gender}
                  onClick={() => handleChange('Sex', gender)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.Sex === gender
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">
                    {gender === 'male' ? '👨' : '👩'}
                  </div>
                  <div className="capitalize font-medium text-gray-900 dark:text-gray-100">{gender}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'age':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              How old are you?
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={formData.Age}
                onChange={(e) => handleChange('Age', parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                min="0"
                max="120"
                className="w-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-800 
                           text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <span className="text-gray-500 dark:text-gray-400">years</span>
            </div>
            {errors.Age && (
              <p className="text-sm text-red-500">{errors.Age}</p>
            )}
          </div>
        );

      case 'class':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Which ticket class are you traveling in?
            </h3>
            <div className="space-y-3">
              {[
                { value: 1, label: '1st Class', desc: 'Luxury accommodations', icon: '👑' },
                { value: 2, label: '2nd Class', desc: 'Standard accommodations', icon: '⭐' },
                { value: 3, label: '3rd Class', desc: 'Economy accommodations', icon: '🎫' }
              ].map((cls) => (
                <button
                  key={cls.value}
                  onClick={() => handleChange('Pclass', cls.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4 ${
                    formData.Pclass === cls.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl">{cls.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{cls.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{cls.desc}</div>
                  </div>
                  {formData.Pclass === cls.value && (
                    <CheckCircle className="ml-auto text-blue-500" size={24} />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'embarked':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Which port did you embark from?
            </h3>
            <div className="space-y-3">
              {[
                { value: 'S', label: 'Southampton', desc: 'England, UK', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
                { value: 'C', label: 'Cherbourg', desc: 'France', emoji: '🇫🇷' },
                { value: 'Q', label: 'Queenstown', desc: 'Ireland', emoji: '🇮🇪' }
              ].map((port) => (
                <button
                  key={port.value}
                  onClick={() => handleChange('Embarked', port.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4 ${
                    formData.Embarked === port.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl">{port.emoji}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{port.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{port.desc}</div>
                  </div>
                  {formData.Embarked === port.value && (
                    <CheckCircle className="ml-auto text-blue-500" size={24} />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'family':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              How many family members are traveling with you?
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Siblings / Spouses
                </label>
                <input
                  type="number"
                  value={formData.SibSp}
                  onChange={(e) => handleChange('SibSp', parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  max="10"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 
                             text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parents / Children
                </label>
                <input
                  type="number"
                  value={formData.Parch}
                  onChange={(e) => handleChange('Parch', parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  max="10"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 
                             text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total family: {formData.SibSp + formData.Parch} members
            </p>
          </div>
        );

      case 'fare':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              What was your ticket fare?
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-2xl text-gray-500 dark:text-gray-400">£</span>
              <input
                type="number"
                value={formData.Fare}
                onChange={(e) => handleChange('Fare', parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                min="0"
                step="0.01"
                className="w-40 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-800 
                           text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            {errors.Fare && (
              <p className="text-sm text-red-500">{errors.Fare}</p>
            )}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Average fares: 1st Class: £200 | 2nd Class: £50 | 3rd Class: £15
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 ${className}`}>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => index < currentStep && setCurrentStep(index)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : isCompleted
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
              disabled={!isCompleted}
            >
              <Icon size={14} />
              <span>{step.label}</span>
              {isCompleted && <CheckCircle size={12} />}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[200px]"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg 
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                       text-gray-700 dark:text-gray-200"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={isSubmitting}
          className={`px-6 py-2.5 rounded-lg flex items-center gap-2 ml-auto transition-colors ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </>
          ) : isLastStep ? (
            <>
              Complete
              <CheckCircle size={18} />
            </>
          ) : (
            <>
              Next
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {errors.submit && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-300">{errors.submit}</p>
        </div>
      )}
    </div>
  );
}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This will be used to personalize your experience.
            </p>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 
                         text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>
        );

      case 'gender':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              What is your gender?
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {['male', 'female'].map((gender) => (
                <button
                  key={gender}
                  onClick={() => handleChange('Sex', gender)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.Sex === gender
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">
                    {gender === 'male' ? '👨' : '👩'}
                  </div>
                  <div className="capitalize font-medium text-gray-900 dark:text-gray-100">{gender}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'age':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              How old are you?
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={formData.Age}
                onChange={(e) => handleChange('Age', parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                min="0"
                max="120"
                className="w-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-800 
                           text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <span className="text-gray-500 dark:text-gray-400">years</span>
            </div>
            {errors.Age && (
              <p className="text-sm text-red-500">{errors.Age}</p>
            )}
          </div>
        );

      case 'class':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Which ticket class are you traveling in?
            </h3>
            <div className="space-y-3">
              {[
                { value: 1, label: '1st Class', desc: 'Luxury accommodations', icon: '👑' },
                { value: 2, label: '2nd Class', desc: 'Standard accommodations', icon: '⭐' },
                { value: 3, label: '3rd Class', desc: 'Economy accommodations', icon: '🎫' }
              ].map((cls) => (
                <button
                  key={cls.value}
                  onClick={() => handleChange('Pclass', cls.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4 ${
                    formData.Pclass === cls.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl">{cls.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{cls.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{cls.desc}</div>
                  </div>
                  {formData.Pclass === cls.value && (
                    <CheckCircle className="ml-auto text-blue-500" size={24} />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'embarked':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Which port did you embark from?
            </h3>
            <div className="space-y-3">
              {[
                { value: 'S', label: 'Southampton', desc: 'England, UK', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
                { value: 'C', label: 'Cherbourg', desc: 'France', emoji: '🇫🇷' },
                { value: 'Q', label: 'Queenstown', desc: 'Ireland', emoji: '🇮🇪' }
              ].map((port) => (
                <button
                  key={port.value}
                  onClick={() => handleChange('Embarked', port.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4 ${
                    formData.Embarked === port.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl">{port.emoji}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{port.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{port.desc}</div>
                  </div>
                  {formData.Embarked === port.value && (
                    <CheckCircle className="ml-auto text-blue-500" size={24} />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'family':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              How many family members are traveling with you?
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Siblings / Spouses
                </label>
                <input
                  type="number"
                  value={formData.SibSp}
                  onChange={(e) => handleChange('SibSp', parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  max="10"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 
                             text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parents / Children
                </label>
                <input
                  type="number"
                  value={formData.Parch}
                  onChange={(e) => handleChange('Parch', parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  max="10"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 
                             text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total family: {formData.SibSp + formData.Parch} members
            </p>
          </div>
        );

      case 'fare':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              What was your ticket fare?
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-2xl text-gray-500 dark:text-gray-400">£</span>
              <input
                type="number"
                value={formData.Fare}
                onChange={(e) => handleChange('Fare', parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                min="0"
                step="0.01"
                className="w-40 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-800 
                           text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            {errors.Fare && (
              <p className="text-sm text-red-500">{errors.Fare}</p>
            )}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Average fares: 1st Class: £200 | 2nd Class: £50 | 3rd Class: £15
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 ${className}`}>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => index < currentStep && setCurrentStep(index)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : isCompleted
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
              disabled={!isCompleted}
            >
              <Icon size={14} />
              <span>{step.label}</span>
              {isCompleted && <CheckCircle size={12} />}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[200px]"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg 
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                       text-gray-700 dark:text-gray-200"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={isSubmitting}
          className={`px-6 py-2.5 rounded-lg flex items-center gap-2 ml-auto transition-colors ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </>
          ) : isLastStep ? (
            <>
              Complete
              <CheckCircle size={18} />
            </>
          ) : (
            <>
              Next
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {errors.submit && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-300">{errors.submit}</p>
        </div>
      )}
    </div>
  );
}
      case 'gender':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              What is your gender?
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {['male', 'female'].map((gender) => (
                <button
                  key={gender}
                  onClick={() => handleChange('Sex', gender)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.Sex === gender
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">
                    {gender === 'male' ? '👨' : '👩'}
                  </div>
                  <div className="capitalize font-medium">{gender}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'age':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              How old are you?
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={formData.Age}
                onChange={(e) => handleChange('Age', parseInt(e.target.value) || 0)}
                min="0"
                max="120"
                className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <span className="text-gray-500">years</span>
            </div>
            {errors.Age && (
              <p className="text-sm text-red-500">{errors.Age}</p>
            )}
          </div>
        );

      case 'class':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Which ticket class are you traveling in?
            </h3>
            <div className="space-y-3">
              {[
                { value: 1, label: '1st Class', desc: 'Luxury accommodations', icon: '👑' },
                { value: 2, label: '2nd Class', desc: 'Standard accommodations', icon: '⭐' },
                { value: 3, label: '3rd Class', desc: 'Economy accommodations', icon: '🎫' }
              ].map((cls) => (
                <button
                  key={cls.value}
                  onClick={() => handleChange('Pclass', cls.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4 ${
                    formData.Pclass === cls.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{cls.icon}</span>
                  <div>
                    <div className="font-medium">{cls.label}</div>
                    <div className="text-sm text-gray-500">{cls.desc}</div>
                  </div>
                  {formData.Pclass === cls.value && (
                    <CheckCircle className="ml-auto text-blue-500" size={24} />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'embarked':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Which port did you embark from?
            </h3>
            <div className="space-y-3">
              {[
                { value: 'S', label: 'Southampton', desc: 'England, UK', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
                { value: 'C', label: 'Cherbourg', desc: 'France', emoji: '🇫🇷' },
                { value: 'Q', label: 'Queenstown', desc: 'Ireland', emoji: '🇮🇪' }
              ].map((port) => (
                <button
                  key={port.value}
                  onClick={() => handleChange('Embarked', port.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4 ${
                    formData.Embarked === port.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{port.emoji}</span>
                  <div>
                    <div className="font-medium">{port.label}</div>
                    <div className="text-sm text-gray-500">{port.desc}</div>
                  </div>
                  {formData.Embarked === port.value && (
                    <CheckCircle className="ml-auto text-blue-500" size={24} />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'family':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              How many family members are traveling with you?
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Siblings / Spouses
                </label>
                <input
                  type="number"
                  value={formData.SibSp}
                  onChange={(e) => handleChange('SibSp', parseInt(e.target.value) || 0)}
                  min="0"
                  max="10"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parents / Children
                </label>
                <input
                  type="number"
                  value={formData.Parch}
                  onChange={(e) => handleChange('Parch', parseInt(e.target.value) || 0)}
                  min="0"
                  max="10"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Total family: {formData.SibSp + formData.Parch} members
            </p>
          </div>
        );

      case 'fare':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              What was your ticket fare?
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-2xl text-gray-500">£</span>
              <input
                type="number"
                value={formData.Fare}
                onChange={(e) => handleChange('Fare', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            {errors.Fare && (
              <p className="text-sm text-red-500">{errors.Fare}</p>
            )}
            <div className="text-sm text-gray-500">
              Average fares: 1st Class: £200 | 2nd Class: £50 | 3rd Class: £15
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => index < currentStep && setCurrentStep(index)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : isCompleted
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
              disabled={!isCompleted}
            >
              <Icon size={14} />
              <span>{step.label}</span>
              {isCompleted && <CheckCircle size={12} />}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[200px]"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={isSubmitting}
          className={`px-6 py-2.5 rounded-lg flex items-center gap-2 ml-auto transition-colors ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </>
          ) : isLastStep ? (
            <>
              Complete
              <CheckCircle size={18} />
            </>
          ) : (
            <>
              Next
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {errors.submit && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}
    </div>
  );
}
