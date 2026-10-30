"use client";

import { useEffect, useRef } from "react";

export interface Wreck {
  id: string;
  /** Cell keys ("row,col") of every cell of the sunk ship */
  cells: string[];
  /** Date.now() when the ship sank */
  t0: number;
}

/** How long a sunk ship burns before only smoke is left. */
export const WRECK_BURN_MS = 3600;

interface Props {
  boardRef: React.RefObject<HTMLElement | null>;
  wrecks: Wreck[];
}

interface Flame {
  kind: "flame" | "ember" | "smoke";
  el: HTMLElement;
  /** Offset from the cell centre, in px (follows the cell if the layout moves) */
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  tone: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Flame colour over its lifetime: pale yellow -> orange -> deep red. */
function flameRgb(k: number): [number, number, number] {
  if (k < 0.35) {
    const t = k / 0.35;
    return [255, Math.round(lerp(235, 150, t)), Math.round(lerp(150, 40, t))];
  }
  const t = (k - 0.35) / 0.65;
  return [Math.round(lerp(255, 150, t)), Math.round(lerp(150, 30, t)), Math.round(lerp(40, 10, t))];
}

/**
 * Draws fire over every cell of a freshly sunk ship, then keeps a slow column of smoke rising
 * from the wreck. Positions follow the live cell elements, so layout changes cannot misplace it.
 */
export function WreckEffects({ boardRef, wrecks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrecksRef = useRef<Wreck[]>(wrecks);
  wrecksRef.current = wrecks;
  const particles = useRef<Flame[]>([]);
  const raf = useRef<number | null>(null);
  const cellEls = useRef<Map<string, HTMLElement>>(new Map());

  const start = () => {
    if (raf.current !== null) return;
    let last = performance.now();

    const cellEl = (key: string): HTMLElement | null => {
      const cached = cellEls.current.get(key);
      if (cached && cached.isConnected) return cached;
      const el = boardRef.current?.querySelector<HTMLElement>(`button[data-key="${key}"]`) ?? null;
      if (el) cellEls.current.set(key, el);
      return el;
    };

    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        raf.current = null;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // One rect per element per frame
      const rects = new Map<HTMLElement, { cx: number; cy: number; size: number }>();
      const centre = (el: HTMLElement) => {
        let r = rects.get(el);
        if (!r) {
          const b = el.getBoundingClientRect();
          r = { cx: b.left + b.width / 2, cy: b.top + b.height / 2, size: b.width };
          rects.set(el, r);
        }
        return r;
      };

      // --- Emit ---
      const nowMs = Date.now();
      for (const wreck of wrecksRef.current) {
        const age = nowMs - wreck.t0;
        const burning = age < WRECK_BURN_MS;
        // Fire ramps up quickly and dies down over the last second
        const intensity = !burning
          ? 0
          : age < 350
            ? age / 350
            : age > WRECK_BURN_MS - 1000
              ? Math.max(0, (WRECK_BURN_MS - age) / 1000)
              : 1;
        for (const key of wreck.cells) {
          const el = cellEl(key);
          if (!el) continue;
          const { size } = centre(el);
          if (intensity > 0) {
            // flames: expected count per frame, rounded randomly so low rates still emit
            const expected = intensity * 110 * dt * (0.8 + Math.random() * 0.4);
            let count = Math.floor(expected);
            if (Math.random() < expected - count) count++;
            for (let n = 0; n < count; n++) {
              particles.current.push({
                kind: "flame",
                el,
                ox: rand(-0.38, 0.38) * size,
                oy: rand(0.05, 0.42) * size,
                vx: rand(-10, 10),
                vy: -rand(40, 105) * (size / 32),
                age: 0,
                life: rand(0.45, 0.95),
                size: rand(0.34, 0.6) * size,
                tone: Math.random(),
              });
            }
            if (Math.random() < intensity * 9 * dt) {
              particles.current.push({
                kind: "ember",
                el,
                ox: rand(-0.4, 0.4) * size,
                oy: rand(-0.1, 0.3) * size,
                vx: rand(-22, 22),
                vy: -rand(70, 150),
                age: 0,
                life: rand(0.7, 1.4),
                size: rand(1.2, 2.4),
                tone: Math.random(),
              });
            }
          }
          // smoke starts while the fire is still dying and carries on for as long as the wreck exists
          if (age > WRECK_BURN_MS * 0.45 && Math.random() < 3.4 * dt) {
            particles.current.push({
              kind: "smoke",
              el,
              ox: rand(-0.3, 0.3) * size,
              oy: rand(-0.2, 0.15) * size,
              vx: rand(6, 20),
              vy: -rand(14, 30),
              age: 0,
              life: rand(1.8, 3.0),
              size: rand(0.38, 0.6) * size,
              tone: Math.random(),
            });
          }
        }
      }

      // --- Glow under burning ships ---
      for (const wreck of wrecksRef.current) {
        const age = nowMs - wreck.t0;
        if (age >= WRECK_BURN_MS) continue;
        const intensity =
          age < 350 ? age / 350 : age > WRECK_BURN_MS - 1000 ? Math.max(0, (WRECK_BURN_MS - age) / 1000) : 1;
        for (const key of wreck.cells) {
          const el = cellEl(key);
          if (!el) continue;
          const { cx, cy, size } = centre(el);
          const flicker = 0.8 + 0.2 * Math.sin(now / 55 + cx);
          const r = size * 1.05;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(255,150,50,${0.5 * intensity * flicker})`);
          g.addColorStop(1, "rgba(255,70,0,0)");
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Particles (smoke first so flames render over it) ---
      const ps = particles.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.age += dt;
        if (p.age >= p.life || !p.el.isConnected) {
          ps.splice(i, 1);
          continue;
        }
        p.ox += p.vx * dt;
        p.oy += p.vy * dt;
        if (p.kind === "smoke") p.vx += 4 * dt; // drifts with the breeze
      }
      const draw = (kind: Flame["kind"]) => {
        for (const p of ps) {
          if (p.kind !== kind) continue;
          const k = p.age / p.life;
          const { cx, cy } = centre(p.el);
          const x = cx + p.ox;
          const y = cy + p.oy;
          if (kind === "smoke") {
            const rad = p.size * (1 + 2.1 * k);
            const a = 0.5 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - k);
            const c = p.tone < 0.5 ? [64, 60, 58] : [104, 98, 94];
            ctx.globalCompositeOperation = "source-over";
            const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
            g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`);
            g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, Math.PI * 2);
            ctx.fill();
          } else if (kind === "flame") {
            const [r, g2, b] = flameRgb(Math.min(1, k + p.tone * 0.15));
            const rad = Math.max(0.5, p.size * (1 - 0.55 * k));
            const a = 0.9 * (1 - k * k);
            ctx.globalCompositeOperation = "lighter";
            const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
            g.addColorStop(0, `rgba(${r},${g2},${b},${a})`);
            g.addColorStop(1, `rgba(${r},${g2},${b},0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = `rgba(255,${Math.round(lerp(210, 120, k))},50,${1 - k})`;
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };
      draw("smoke");
      draw("flame");
      draw("ember");
      ctx.globalCompositeOperation = "source-over";

      if (wrecksRef.current.length > 0 || ps.length > 0) {
        raf.current = requestAnimationFrame(loop);
      } else {
        raf.current = null;
        ctx.clearRect(0, 0, w, h);
      }
    };
    raf.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (wrecks.length === 0) {
      cellEls.current.clear();
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrecks]);

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
    },
    []
  );

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9990,
      }}
    />
  );
}
