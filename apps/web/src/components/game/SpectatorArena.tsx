"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GameBoard } from "./GameBoard";
import { ShotAnimation, SHOT_FLIGHT_MS } from "./ShotAnimation";
import { WreckEffects, type Wreck } from "./WreckEffects";
import { MatchStartBanner } from "./MatchStartBanner";
import { useGameSocket } from "@/lib/useGameSocket";
import { getSocket } from "@/lib/socket";
import { useAuthCtx } from "@/lib/AuthContext";
import type { BoardCells, Ship, ShipType } from "@/types/game";

const LETTERS = "ABCDEFGHIJ";
const SHIP_BY_SIZE: Record<number, ShipType> = {
  5: "carrier",
  4: "battleship",
  3: "cruiser",
  2: "destroyer",
};

type Outcome = "hit" | "miss" | "sunk" | "mine" | "boom";
type Side = 0 | 1;
interface Chat {
  sender: string;
  username: string;
  text: string;
}
interface LogEntry {
  cell: string;
  by: Side;
  result: string;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const keyOf = (row: number, col: number) => `${row},${col}`;

/**
 * Watch-only view of a live match: both boards from the outside (no fleets are ever shown),
 * the shots as they happen, and a chat room that only spectators can see.
 */
export function SpectatorArena({ matchId }: { matchId: string }) {
  const router = useRouter();
  const { address, nickname } = useAuthCtx();

  const [state, setState] = useState<"connecting" | "watching" | "gone">("connecting");
  const [notice, setNotice] = useState<string | null>(null);
  const [phase, setPhase] = useState<"placement" | "battle" | "finished">("placement");
  const [addrs, setAddrs] = useState<[string, string]>(["", ""]);
  const [names, setNames] = useState<[string, string]>(["Player 1", "Player 2"]);
  const [turn, setTurn] = useState<Side | null>(null);
  const [timerSecs, setTimerSecs] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [streaks, setStreaks] = useState<[number, number]>([0, 0]);
  // boards[i] = what has been fired at player i's waters
  const [boards, setBoards] = useState<[BoardCells, BoardCells]>([{}, {}]);
  const [sunkShips, setSunkShips] = useState<[Ship[], Ship[]]>([[], []]);
  const [wrecks, setWrecks] = useState<[Wreck[], Wreck[]]>([[], []]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [winner, setWinner] = useState<Side | null>(null);
  const [endNote, setEndNote] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ you: string; opponent: string } | null>(null);
  const [chat, setChat] = useState<Chat[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [watching, setWatching] = useState(1);
  const [anim, setAnim] = useState<{ side: Side; cell: string; outcome: Outcome } | null>(null);

  const boardRefs = [useRef<HTMLDivElement | null>(null), useRef<HTMLDivElement | null>(null)];
  const deadlineRef = useRef<number | null>(null);
  const addrsRef = useRef(addrs);
  addrsRef.current = addrs;
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const sideOf = (a?: string | null): Side | null => {
    if (!a) return null;
    const i = addrsRef.current.findIndex((x) => x && x.toLowerCase() === a.toLowerCase());
    return i === 0 ? 0 : i === 1 ? 1 : null;
  };
  const setAt = <T,>(set: React.Dispatch<React.SetStateAction<[T, T]>>, side: Side, v: (old: T) => T) =>
    set((prev) => (side === 0 ? [v(prev[0]), prev[1]] : [prev[0], v(prev[1])]));

  const { spectateLeave, sendSpectatorChat } = useGameSocket({
    onSpectateView: (view) => {
      setState("watching");
      const a: [string, string] = [view.players[0].address, view.players[1].address];
      addrsRef.current = a;
      setAddrs(a);
      if (view.usernames) setNames(view.usernames);
      setPhase(view.phase === "finished" ? "finished" : view.phase === "battle" ? "battle" : "placement");
      setTurn(view.turn ?? null);
      setScores([view.players[0].score, view.players[1].score]);
      setStreaks([view.players[0].streak, view.players[1].streak]);

      const b: [BoardCells, BoardCells] = [{}, {}];
      const l: LogEntry[] = [];
      for (const sh of view.shots ?? []) {
        if (sh.outcome === "timeout") continue;
        const target: Side = sh.player === 0 ? 1 : 0; // the shooter's opponent
        b[target][keyOf(sh.y, sh.x)] = (sh.outcome === "mine" ? "boom" : sh.outcome) as string as BoardCells[string];
        l.push({ cell: `${LETTERS[sh.y] ?? "A"}${sh.x + 1}`, by: sh.player, result: sh.outcome });
      }
      setBoards(b);
      setLog(l.reverse());
      if (view.winner !== null && view.winner !== undefined) {
        setWinner(view.winner);
      }
      setChat(view.chat ?? []);
    },
    onMatchStart: (_id, payload: any) => {
      setPhase("battle");
      const players = (payload?.players ?? []) as { address: string; username: string }[];
      if (players.length === 2) {
        const a: [string, string] = [players[0].address, players[1].address];
        addrsRef.current = a;
        setAddrs(a);
        setNames([players[0].username, players[1].username]);
        setBanner({ you: players[0].username, opponent: players[1].username });
      }
      setTurn(sideOf(payload?.currentTurn));
      deadlineRef.current = typeof payload?.turnDeadline === "number" ? payload.turnDeadline : null;
    },
    onTurnTimer: (currentTurn, _secs, deadline) => {
      setTurn(sideOf(currentTurn));
      deadlineRef.current = deadline ?? null;
    },
    onMatchUpdate: (view) => {
      if (view?.turn !== undefined) setTurn(view.turn);
    },
    onShotResult: (r) => {
      const shooter = sideOf(r.shooter);
      if (shooter === null) return;
      const target: Side = shooter === 0 ? 1 : 0;
      const key = keyOf(r.row, r.col);
      const outcome = (r.outcome === "mine" ? "boom" : r.outcome) as Outcome;
      const sunkKeys = r.sunkShip ? r.sunkShip.cells.map((c) => keyOf(c.y, c.x)) : [];

      // Missile first; the boards change when it lands
      setAnim({ side: target, cell: key, outcome });
      deadlineRef.current = null;
      setTimeout(() => {
        setAt(setBoards, target, (old) => {
          const next = { ...old, [key]: outcome as any };
          sunkKeys.forEach((k) => (next[k] = "sunk" as any));
          return next;
        });
        if (r.sunkShip) {
          setAt(setSunkShips, target, (old) => [
            ...old,
            {
              type: SHIP_BY_SIZE[r.sunkShip!.length] ?? "cruiser",
              size: r.sunkShip!.length,
              row: Math.min(...r.sunkShip!.cells.map((c) => c.y)),
              col: Math.min(...r.sunkShip!.cells.map((c) => c.x)),
              vertical: r.sunkShip!.orientation === "V",
              wreck: true,
            },
          ]);
          setAt(setWrecks, target, (old) => [
            ...old,
            { id: `${sunkKeys.join("|")}@${Date.now()}`, cells: sunkKeys, t0: Date.now() },
          ]);
        }
        setScores((s) => {
          const v = r.scores[r.shooter];
          return v === undefined ? s : shooter === 0 ? [v, s[1]] : [s[0], v];
        });
        setStreaks((s) => {
          const v = r.streaks[r.shooter];
          return v === undefined ? s : shooter === 0 ? [v, s[1]] : [s[0], v];
        });
        setLog((prev) => [
          { cell: `${LETTERS[r.row] ?? "A"}${r.col + 1}`, by: shooter, result: r.outcome },
          ...prev,
        ]);
        const next = sideOf(r.nextTurn);
        if (next !== null) setTurn(next);
      }, SHOT_FLIGHT_MS);
    },
    onMatchEnd: (p) => {
      const w = sideOf(p.winner);
      setTimeout(() => {
        setPhase("finished");
        setWinner(w);
        setTurn(null);
        deadlineRef.current = null;
        setEndNote(p.forfeit ? "won by forfeit" : "sank the whole enemy fleet");
      }, 1800);
    },
    onSpectatorChat: (m) => setChat((prev) => [...prev, m].slice(-100)),
    onSpectateCount: setWatching,
    onErrorCode: (code, message) => {
      if (code === "SPECTATE_IS_PLAYER") {
        router.replace(`/arena?match=${matchId}`);
      } else if (code === "SPECTATE_NOT_FOUND") {
        setState("gone");
      } else {
        setNotice(message);
      }
    },
  });

  // Join the match as a spectator now and after every reconnect; leave when the page closes
  useEffect(() => {
    if (!address) return;
    const socket = getSocket();
    const join = () => socket.emit("spectate:join", { matchId });
    socket.on("connect", join);
    if (socket.connected) join();
    return () => {
      socket.off("connect", join);
      spectateLeave(matchId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, matchId]);

  // Server-clock countdown
  useEffect(() => {
    if (phase !== "battle") return;
    const t = setInterval(() => {
      const d = deadlineRef.current;
      setTimerSecs(d ? Math.max(0, Math.ceil((d - Date.now()) / 1000)) : 0);
    }, 250);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [chat.length]);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    sendSpectatorChat(matchId, text);
    setChatInput("");
  };

  const leave = () => {
    spectateLeave(matchId);
    router.push("/play");
  };

  const shipsAfloat = (side: Side) => 5 - sunkShips[side].length;
  const card = {
    background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
    borderColor: "var(--line)",
  } as const;

  if (!address) {
    return <Message title="Connect your wallet to spectate" body="Spectators need to be signed in to watch and chat." />;
  }
  if (state === "gone") {
    return (
      <Message
        title="This match is no longer live"
        body="It may have finished or the match code is wrong."
        action={<button type="button" onClick={() => router.push("/play")} className="mt-5 px-5 py-2.5 rounded-[12px] font-bold" style={{ background: "var(--signal)", color: "var(--abyss)" }}>Back to lobby</button>}
      />
    );
  }

  return (
    <main className="max-w-[1440px] mx-auto px-8 py-7 pb-14">
      {banner && <MatchStartBanner you={banner.you} opponent={banner.opponent} onDone={() => setBanner(null)} />}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <div className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--brass)" }}>
            👁 Spectating · watch only · {watching} watching
          </div>
          <h1 className="font-display font-extrabold text-[28px] tracking-tight">
            {names[0]} <span className="text-[var(--flare)] text-[0.7em]">VS</span> {names[1]}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {phase === "battle" && turn !== null && (
            <div className="px-4 py-2 rounded-[14px] border text-[14px]" style={card}>
              <b className="font-display">{names[turn]}</b> is aiming
              {timerSecs > 0 && <span className="ml-2 text-[var(--mist)]">{timerSecs}s</span>}
            </div>
          )}
          <button
            type="button"
            onClick={leave}
            className="px-4 py-2 rounded-[10px] text-[13px] font-bold border transition-all hover:-translate-y-px"
            style={{ background: "rgba(235,181,74,0.08)", borderColor: "rgba(235,181,74,0.3)", color: "var(--brass)" }}
          >
            ← Leave Room
          </button>
        </div>
      </div>

      {notice && <div className="mb-4 text-[13px]" style={{ color: "var(--flare)" }} role="alert">{notice}</div>}

      {phase === "finished" && winner !== null && (
        <div className="mb-5 px-5 py-3 rounded-[14px] border font-display font-bold text-[16px]" style={{ ...card, borderColor: "rgba(53,214,192,.5)", color: "var(--signal)" }}>
          🏆 {names[winner]} wins{endNote ? ` — ${endNote}` : ""}!
        </div>
      )}

      <div className="grid gap-5 items-start" style={{ gridTemplateColumns: "minmax(0,1fr) 340px" }}>
        <div>
          {state === "connecting" ? (
            <div className="p-10 text-center text-[var(--mist)] rounded-[20px] border" style={card}>Joining the match…</div>
          ) : phase === "placement" ? (
            <div className="p-10 text-center rounded-[20px] border" style={card}>
              <div className="font-display font-bold text-[20px] mb-1.5">Fleets are being deployed</div>
              <p className="text-[var(--mist)] text-[14px]">
                {names[0]} and {names[1]} are placing their ships. The battle appears here as soon as it begins.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {([0, 1] as Side[]).map((side) => (
                <div key={side} className="min-w-0" ref={boardRefs[side]}>
                  <h2 className="flex justify-between items-baseline mb-1 px-1 font-display font-bold text-[17px] tracking-tight">
                    {names[side]}&apos;s waters
                    <span className="font-body font-medium text-[13px] text-[var(--mist)]">{shipsAfloat(side)} of 5 vessels afloat</span>
                  </h2>
                  <div className="px-1 mb-3 text-[13px] text-[var(--mist)]">
                    {addrs[side] && short(addrs[side])} · score <b className="text-[var(--foam)]">{scores[side]}</b>
                    {streaks[side] >= 2 && <span style={{ color: "var(--brass)" }}> · 🔥 {streaks[side]} streak</span>}
                  </div>
                  <GameBoard id={`spec-${side}`} cells={boards[side]} ships={sunkShips[side]} isEnemy />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-5">
          {/* Spectator chat */}
          <section className="rounded-[20px] p-5 border" style={card}>
            <h2 className="font-display font-bold text-[17px] tracking-tight">Spectator chat</h2>
            <p className="text-[12px] text-[var(--mist)] mb-3">Only spectators see this. The players can&apos;t.</p>
            <div className="h-[220px] overflow-auto custom-scroll grid gap-2 content-start text-[14px] mb-3" aria-live="polite">
              {chat.length === 0 && <span className="text-[var(--mist)]">No comments yet. Say something!</span>}
              {chat.map((m, i) => (
                <p key={i}>
                  <span
                    className="font-semibold mr-1.5"
                    style={{ color: address && m.sender.toLowerCase() === address.toLowerCase() ? "var(--brass)" : "var(--signal)" }}
                  >
                    {address && m.sender.toLowerCase() === address.toLowerCase() ? (nickname ?? "You") : m.username}
                  </span>
                  {m.text}
                </p>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendChat} className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={200}
                placeholder="Comment on the match…"
                aria-label="Spectator chat message"
                className="flex-1 min-w-0 rounded-[12px] px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--signal)]"
                style={{ background: "var(--abyss)", border: "1px solid var(--line)" }}
              />
              <button type="submit" className="px-4 rounded-[12px] font-bold text-[14px]" style={{ background: "var(--signal)", color: "var(--abyss)" }}>
                Send
              </button>
            </form>
          </section>

          {/* Shots */}
          <section className="rounded-[20px] p-5 border" style={card}>
            <h2 className="font-display font-bold text-[17px] tracking-tight mb-3">Shot log</h2>
            <ul className="list-none p-0 grid gap-2 max-h-[230px] overflow-auto custom-scroll text-sm" aria-label="Shot history">
              {log.length === 0 && <li className="text-[var(--mist)]">No shots yet.</li>}
              {log.map((e, i) => (
                <li key={i} className="flex gap-2.5 items-baseline">
                  <b className="font-display font-bold text-[13px] min-w-[30px]">{e.cell}</b>
                  <span className="text-[var(--mist)] flex-1 truncate">{names[e.by]}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[12px] font-semibold"
                    style={{
                      background: e.result === "miss" ? "rgba(143,176,173,.15)" : "rgba(255,106,77,.18)",
                      color: e.result === "miss" ? "var(--mist)" : "#ff9a84",
                    }}
                  >
                    {e.result.charAt(0).toUpperCase() + e.result.slice(1)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Missiles fly from the shooter's board to the target's board */}
      {([0, 1] as Side[]).map((side) => (
        <ShotAnimation
          key={side}
          boardRef={boardRefs[side]}
          sourceRef={boardRefs[side === 0 ? 1 : 0]}
          targetCell={anim?.side === side ? anim.cell : null}
          outcome={anim?.side === side ? anim.outcome : null}
          onDone={() => setAnim((a) => (a?.side === side ? null : a))}
        />
      ))}
      <WreckEffects boardRef={boardRefs[0]} wrecks={wrecks[0]} />
      <WreckEffects boardRef={boardRefs[1]} wrecks={wrecks[1]} />
    </main>
  );
}

function Message({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <main className="max-w-[560px] mx-auto px-8 py-24 text-center">
      <h1 className="font-display font-extrabold text-[26px] tracking-tight mb-2">{title}</h1>
      <p className="text-[var(--mist)]">{body}</p>
      {action}
    </main>
  );
}
