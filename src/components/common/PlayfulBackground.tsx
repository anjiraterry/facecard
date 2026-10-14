'use client';

import React from 'react';

export function PlayfulBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 bg-white">
      {/* Subtle very soft ambient gradient in the top corner */}
      <div 
        className="absolute -top-32 right-0 w-[450px] h-[350px] opacity-40 blur-[120px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 184, 0, 0.15) 0%, rgba(242, 166, 162, 0.08) 50%, transparent 80%)',
        }}
      />
    </div>
  );
}
