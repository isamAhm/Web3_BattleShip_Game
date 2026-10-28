'use client';

import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'cyan' | 'violet' | 'amber' | 'red' | 'neutral' | 'success';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  className,
  variant = 'cyan',
  size = 'md',
  ...props
}: BadgeProps) {
  const variants = {
    cyan: 'bg-arena-cyan/15 text-arena-cyanBright border-arena-cyan/30',
    violet: 'bg-arena-violet/15 text-arena-violetBright border-arena-violet/30',
    amber: 'bg-arena-amber/15 text-arena-amberBright border-arena-amber/30',
    red: 'bg-arena-red/15 text-arena-redBright border-arena-red/30',
    neutral: 'bg-arena-border/30 text-arena-textSub border-arena-border/50',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5 rounded',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 border font-mono tracking-wide select-none',
          variants[variant],
          sizes[size],
          className,
        ),
      )}
      {...props}
    >
      {children}
    </span>
  );
}
