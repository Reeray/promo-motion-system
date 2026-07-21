import React from 'react';

// Shared "Lego block" shape used across categories (typography / ui / transition).
export type Block = {
  name: string;
  category: string;
  source: string;
  desc: string;
  poster: number;
  durationInFrames?: number; // per-block loop length; defaults to 75 when omitted
  fps?: number; // defaults to 30; transitions run at 60 so fast pushes read as motion
  tag?: 'outro' | 'intro' | 'full-tro'; // transition role: exit half, enter half, or both
  Comp: React.FC;
};
