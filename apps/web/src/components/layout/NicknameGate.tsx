"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthCtx } from "@/lib/AuthContext";
import { NICKNAME_RE, NICKNAME_HINT } from "@/lib/nickname";

/**
 * Asks a signed-in player to pick a nickname (shown to opponents instead of the wallet address).
 * It appears right after connecting; it can be postponed, except in the lobby and arena where a
 * nickname is needed before playing.
 */
export function NicknameGate() {
  const { address, nicknameSet, saveNickname } = useAuthCtx();
  const pathname = usePathname();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [postponed, setPostponed] = useState(false);

  const required = pathname.startsWith("/play") || pathname.startsWith("/arena");
  // The settings page has its own nickname field
  if (!address || nicknameSet !== false || pathname.startsWith("/settings") || (postponed && !required)) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = value.trim();
    if (!NICKNAME_RE.test(name)) {
      setError(NICKNAME_HINT);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveNickname(name);
    } catch (err: any) {
      setError(err?.message ?? "Could not save the nickname.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center px-4"
      style={{ background: "rgba(4,14,19,.78)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nickname-title"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-[420px] rounded-[20px] border p-7"
        style={{
          background: "linear-gradient(180deg,rgba(19,48,59,.97),rgba(12,34,43,.98))",
          borderColor: "var(--line)",
        }}
      >
        <h2 id="nickname-title" className="font-display font-extrabold text-[24px] tracking-tight mb-1.5">
          Choose your nickname
        </h2>
        <p className="text-[var(--mist)] text-[14px] mb-5">
          This is the name your opponents see in matches, instead of your wallet address.
        </p>
        <label htmlFor="nickname-input" className="block text-[13px] text-[var(--mist)] mb-1.5">
          Nickname
        </label>
        <input
          id="nickname-input"
          autoFocus
          autoComplete="off"
          maxLength={16}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="e.g. Admiral_Nova"
          className="w-full rounded-[12px] border px-4 py-3 bg-transparent outline-none focus:border-[var(--brass)]"
          style={{ borderColor: "var(--line)" }}
        />
        <div className="min-h-[20px] mt-2 text-[13px]" style={{ color: "var(--flare)" }} role="alert">
          {error}
        </div>
        <div className="flex gap-3 mt-3">
          <button
            type="submit"
            disabled={saving || value.trim().length === 0}
            className="flex-1 rounded-[12px] py-3 font-bold disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,var(--brass),var(--flare))", color: "#0a1a22" }}
          >
            {saving ? "Saving…" : "Save nickname"}
          </button>
          {!required && (
            <button
              type="button"
              onClick={() => setPostponed(true)}
              className="rounded-[12px] px-4 py-3 border text-[var(--mist)]"
              style={{ borderColor: "var(--line)" }}
            >
              Later
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
