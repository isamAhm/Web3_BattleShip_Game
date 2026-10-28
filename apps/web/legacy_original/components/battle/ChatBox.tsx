'use client';

import React, { useState, useRef, useEffect } from 'react';
import { type ChatMessage } from '@/providers/GameContext';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { MessageSquare, Send } from 'lucide-react';

interface ChatBoxProps {
  messages: ChatMessage[];
  myAddress: string | null;
  onSend: (text: string) => void;
}

export function ChatBox({ messages, myAddress, onSend }: ChatBoxProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const normAddress = myAddress?.toLowerCase();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <Card className="p-3 flex flex-col h-56 border-arena-border">
      <div className="flex items-center justify-between pb-2 border-b border-arena-border/50 mb-2">
        <span className="text-xs font-bold text-arena-textSub uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-arena-cyan" />
          Tactical Comms
        </span>
        <span className="text-[10px] font-mono text-arena-textMuted">Encrypted</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-arena-textMuted">
            Comms silent. Send a transmission.
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = normAddress ? m.sender.toLowerCase() === normAddress : false;

            return (
              <div
                key={idx}
                className={`flex flex-col text-xs p-2 rounded-lg max-w-[85%] ${
                  isMe
                    ? 'ml-auto bg-arena-cyan/15 border border-arena-cyan/30 text-white'
                    : 'mr-auto bg-arena-surface border border-arena-border text-arena-textSub'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-arena-textMuted font-mono">
                  <span
                    className={isMe ? 'text-arena-cyan font-bold' : 'text-arena-amber font-bold'}
                  >
                    {m.username || (m.sender ? `${m.sender.slice(0, 6)}...` : 'Commander')}
                  </span>
                  <span>·</span>
                  <span>
                    {new Date(m.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="mt-1 break-words leading-relaxed">{m.text}</div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 pt-2 border-t border-arena-border/40"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Transmit comms..."
          maxLength={140}
          className="flex-1 bg-arena-bg border border-arena-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-arena-textMuted focus:outline-none focus:ring-1 focus:ring-arena-cyan"
        />
        <Button size="sm" variant="cyan" type="submit" disabled={!text.trim()} className="px-2.5">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </Card>
  );
}
