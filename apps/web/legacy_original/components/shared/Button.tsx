'use client';

import React, { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 select-none rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-arena-bg disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-gradient-to-r from-arena-violet to-arena-violetBright text-white hover:brightness-110 shadow-lg shadow-arena-violet/25 focus:ring-arena-violet',
    cyan: 'bg-arena-cyan text-arena-bg font-semibold hover:bg-arena-cyanBright shadow-lg shadow-arena-cyan/25 focus:ring-arena-cyan',
    secondary:
      'bg-arena-panel border border-arena-border text-arena-textMain hover:bg-arena-card hover:border-arena-borderHover focus:ring-arena-border',
    outline:
      'bg-transparent border border-arena-cyan/50 text-arena-cyan hover:bg-arena-cyan/10 hover:border-arena-cyan focus:ring-arena-cyan',
    danger:
      'bg-arena-red/20 border border-arena-red/50 text-arena-redBright hover:bg-arena-red/30 hover:border-arena-red focus:ring-arena-red',
    ghost:
      'bg-transparent text-arena-textSub hover:text-white hover:bg-white/5 focus:ring-white/10',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5 font-semibold',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
      {children}
    </button>
  );
}
