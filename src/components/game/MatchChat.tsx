"use client";

import { useState } from "react";
import type { ChatMessage } from "@/types/game";

export function MatchChat({ initial }: { initial: ChatMessage[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { sender: "You", text: input.trim(), isMe: true },
    ]);
    setInput("");
  };

  return (
    <div
      className="rounded-[20px] p-5 border"
      style={{
        background:
          "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
        borderColor: "var(--line)",
      }}
    >
      <h2 className="font-display font-bold text-[17px] tracking-tight mb-3.5">
        Match chat
      </h2>

      <div className="grid gap-2.5 mb-3.5 text-sm" aria-live="polite">
        {messages.map((msg, i) => (
          <p key={i}>
            <span
              className="font-semibold mr-1.5"
              style={{
                color: msg.isMe ? "var(--brass)" : "var(--signal)",
              }}
            >
              {msg.sender}
            </span>
            {msg.text}
          </p>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 min-w-0 rounded-[12px] px-3.5 py-2.5 text-[var(--foam)] text-sm outline-none focus:ring-2 focus:ring-[var(--signal)]"
          style={{
            background: "var(--abyss)",
            border: "1px solid var(--line)",
            fontFamily: "inherit",
          }}
          placeholder="Say something"
          aria-label="Chat message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          type="button"
          className="px-5 py-2.5 rounded-[12px] font-bold transition-all hover:-translate-y-px"
          style={{
            background: "var(--signal)",
            color: "var(--abyss)",
            boxShadow: undefined,
          }}
          onClick={send}
        >
          Send
        </button>
      </div>
    </div>
  );
}
