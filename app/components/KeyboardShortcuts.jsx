'use client';

import { useEffect } from 'react';

export default function KeyboardShortcuts({ choices, onSelect, disabled }) {
  useEffect(() => {
    if (!choices || disabled) return;

    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const key = e.key;
      if (key >= '1' && key <= '9') {
        const idx = parseInt(key) - 1;
        if (choices[idx]) {
          e.preventDefault();
          onSelect(choices[idx].id);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [choices, onSelect, disabled]);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
      <span className="px-1.5 py-0.5 rounded bg-secondary border border-border font-mono">1</span>
      <span>to</span>
      <span className="px-1.5 py-0.5 rounded bg-secondary border border-border font-mono">
        {Math.min(choices?.length || 0, 9)}
      </span>
      <span>to choose</span>
    </div>
  );
}
