'use client';

import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Card } from './Card';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <Card
        className={`relative z-10 w-full ${maxWidth} bg-arena-surface border-arena-border shadow-2xl p-6`}
        glow="cyan"
      >
        <div className="flex items-center justify-between pb-3 border-b border-arena-border/60 mb-4">
          {title && <h3 className="text-lg font-bold text-arena-textMain">{title}</h3>}
          <button
            onClick={onClose}
            className="text-arena-textMuted hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors ml-auto"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}
