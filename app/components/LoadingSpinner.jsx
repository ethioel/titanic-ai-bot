'use client';

import { motion } from 'framer-motion';

export default function LoadingSpinner({ 
  size = 'md', 
  label = 'Loading...',
  className = '' 
}) {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
    xl: 'w-24 h-24 border-4'
  };

  const spinnerSize = sizes[size] || sizes.md;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <motion.div
        className={`${spinnerSize} border-blue-500 border-t-transparent rounded-full`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
      {label && (
        <p className="mt-3 text-sm text-gray-500 animate-pulse">{label}</p>
      )}
    </div>
  );
}