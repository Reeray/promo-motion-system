import React from 'react';
import {AbsoluteFill} from 'remotion';

const TINT: Record<string, string> = {
  'A · Prism promo': '#0e9e7c',
  'B · jurni launch': '#e0532f',
  'C · GPT-5.5 announce': '#111111',
};

export const Labeled: React.FC<{
  name: string;
  source: keyof typeof TINT | string;
  children: React.ReactNode;
}> = ({name, source, children}) => (
  <AbsoluteFill style={{fontFamily: "'Segoe UI', Arial, sans-serif"}}>
    {children}
    <div
      style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(17,17,17,0.92)',
        borderRadius: 12,
        padding: '10px 16px',
      }}
    >
      <span
        style={{
          fontFamily: 'Consolas, monospace',
          fontSize: 17,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: 0.3,
        }}
      >
        {name}
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: '#fff',
          background: TINT[source] ?? '#555',
          borderRadius: 7,
          padding: '3px 9px',
          letterSpacing: 0.4,
        }}
      >
        {source}
      </span>
    </div>
  </AbsoluteFill>
);
