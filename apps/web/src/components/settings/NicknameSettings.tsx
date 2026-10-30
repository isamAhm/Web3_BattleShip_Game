"use client";

import { useEffect, useState } from "react";
import { useAuthCtx } from "@/lib/AuthContext";
import { NICKNAME_RE, NICKNAME_HINT } from "@/lib/nickname";

export function NicknameSettings() {
  const { address, nickname, saveNickname } = useAuthCtx();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Start from the current name once it has loaded
  useEffect(() => {
    if (nickname) setValue(nickname);
  }, [nickname]);

  if (!address) {
    return <p className="text-[var(--mist)] text-[14px]">Connect your wallet to set a nickname.</p>;
  }

  const name = value.trim();
  const unchanged = name === nickname;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!NICKNAME_RE.test(name)) {
      setError(NICKNAME_HINT);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveNickname(name);
      setSaved(true);
    } catch (err: any) {
      setError(err?.message ?? "Could not save the nickname.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label htmlFor="nickname-setting" className="block font-medium text-[15px] mb-1.5">
        Nickname
      </label>
      <div className="flex gap-3">
        <input
          id="nickname-setting"
          autoComplete="off"
          maxLength={16}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
            setSaved(false);
          }}
          className="flex-1 min-w-0 rounded-[12px] border px-4 py-3 bg-transparent outline-none focus:border-[var(--brass)]"
          style={{ borderColor: "var(--line)" }}
        />
        <button
          type="submit"
          disabled={saving || unchanged || name.length === 0}
          className="rounded-[12px] px-5 py-3 font-bold disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,var(--brass),var(--flare))", color: "#0a1a22" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <div className="min-h-[20px] mt-2 text-[13px]" role="status" style={{ color: error ? "var(--flare)" : "var(--signal)" }}>
        {error ?? (saved ? "Nickname updated." : "")}
      </div>
    </form>
  );
}
