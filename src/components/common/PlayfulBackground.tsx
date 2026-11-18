'use client';

import React from 'react';

export function PlayfulBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 bg-[var(--bg-page)]">
      <div
        className="absolute -top-32 right-0 w-[450px] h-[350px] opacity-40 blur-[120px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(210, 184, 201, 0.25) 0%, rgba(235, 220, 213, 0.16) 50%, transparent 80%)',
        }}
      />
    </div>
  );
}
