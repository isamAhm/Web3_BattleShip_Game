'use client';

import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'none' | 'cyan' | 'violet' | 'amber' | 'red';
  bordered?: boolean;
}

export function Card({ children, className, glow = 'none', bordered = true, ...props }: CardProps) {
  const glowStyles = {
    none: '',
    cyan: 'glow-cyan border-arena-cyan/30',
    violet: 'glow-violet border-arena-violet/30',
    amber: 'glow-amber border-arena-amber/30',
    red: 'glow-red border-arena-red/30',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'bg-arena-surface/85 backdrop-blur-md rounded-xl transition-all duration-200',
          bordered && 'border border-arena-border',
          glowStyles[glow],
          className,
        ),
      )}
      {...props}
    >
      {children}
    </div>
  );
}
