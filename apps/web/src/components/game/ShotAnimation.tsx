"use client";

import { useEffect, useRef } from "react";

/** Time the missile spends in the air. Board state changes should land at this moment. */
export const SHOT_FLIGHT_MS = 750;
/** Extra time after impact before `onDone` fires (explosion / splash tail). */
const IMPACT_TAIL_MS = 800;

type Outcome = "hit" | "miss" | "sunk" | "mine" | "boom";

interface ShotAnimationProps {
  /** The board the shot lands on (its cells carry data-key="row,col") */
  boardRef: React.RefObject<HTMLElement | null>;
  /** Key of the targeted cell, e.g. "3,5" */
  targetCell: string | null;
  /** How the shot resolves */
  outcome: Outcome | null;
  /** Called once the whole effect (flight + impact) is finished */
  onDone: () => void;
  /** Board the missile is launched from. Defaults to the left edge of the target board. */
  sourceRef?: React.RefObject<HTMLElement | null>;
}

interface Vec {
  x: number;
  y: number;
}
/** Effects follow the target cell if the layout moves (banners appearing, scrolling...). */
interface Anchor {
  el: HTMLElement;
  bx: number;
  by: number;
}
interface Missile {
  el: HTMLElement;
  start: Vec;
  ctrl: Vec;
  end: Vec;
  t0: number;
  outcome: Outcome;
  lastTrail: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  grow: number;
  rgb: [number, number, number];
  alpha: number;
  gravity: number;
  glow: boolean;
  anchor?: Anchor;
}
interface Ring {
  x: number;
  y: number;
  t0: number;
  dur: number;
  maxR: number;
  rgb: [number, number, number];
  width: number;
  anchor?: Anchor;
}
interface Flash {
  x: number;
  y: number;
  t0: number;
  dur: number;
  r: number;
  rgb: [number, number, number];
  anchor?: Anchor;
}
interface Scene {
  missiles: Missile[];
  particles: Particle[];
  rings: Ring[];
  flashes: Flash[];
  raf: number | null;
  last: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const RED: Array<[number, number, number]> = [
  [255, 90, 60],
  [255, 140, 70],
  [255, 200, 90],
];
const AMBER: Array<[number, number, number]> = [
  [255, 200, 90],
  [255, 170, 60],
  [255, 240, 170],
];
const WATER: Array<[number, number, number]> = [
  [190, 245, 240],
  [120, 220, 225],
  [235, 255, 255],
];
const SMOKE: [number, number, number] = [92, 84, 80];
const SMOKE_LIGHT: [number, number, number] = [150, 140, 132];

function bezier(m: Missile, t: number): Vec {
  const u = 1 - t;
  return {
    x: u * u * m.start.x + 2 * u * t * m.ctrl.x + t * t * m.end.x,
    y: u * u * m.start.y + 2 * u * t * m.ctrl.y + t * t * m.end.y,
  };
}
function bezierTangent(m: Missile, t: number): Vec {
  return {
    x: 2 * (1 - t) * (m.ctrl.x - m.start.x) + 2 * t * (m.end.x - m.ctrl.x),
    y: 2 * (1 - t) * (m.ctrl.y - m.start.y) + 2 * t * (m.end.y - m.ctrl.y),
  };
}

function addParticles(scene: Scene, n: number, make: () => Particle) {
  for (let i = 0; i < n; i++) scene.particles.push(make());
}

function explode(scene: Scene, x: number, y: number, outcome: Outcome, now: number, anchor: Anchor) {
  if (outcome === "miss") {
    // Splash: ripple rings + droplets thrown up that fall back down
    scene.rings.push({ x, y, t0: now, dur: 650, maxR: 44, rgb: [160, 235, 235], width: 2.5, anchor });
    scene.rings.push({ x, y, t0: now + 120, dur: 650, maxR: 62, rgb: [120, 215, 225], width: 1.5, anchor });
    scene.flashes.push({ x, y, t0: now, dur: 220, r: 26, rgb: [210, 250, 250], anchor });
    addParticles(scene, 16, () => {
      const a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
      const sp = rand(70, 190);
      return {
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        age: 0,
        life: rand(0.45, 0.8),
        size: rand(1.6, 3.2),
        grow: 0,
        rgb: pick(WATER),
        alpha: 0.95,
        gravity: 420,
        glow: false,
        anchor,
      };
    });
    return;
  }

  const isMine = outcome === "mine" || outcome === "boom";
  const isSunk = outcome === "sunk";
  const palette = isMine ? AMBER : RED;
  const big = isSunk || isMine;

  // Flash + shockwave
  scene.flashes.push({
    x,
    y,
    t0: now,
    dur: big ? 380 : 300,
    r: big ? 78 : 58,
    rgb: isMine ? [255, 205, 90] : [255, 100, 60],
    anchor,
  });
  scene.flashes.push({ x, y, t0: now, dur: 160, r: big ? 34 : 24, rgb: [255, 250, 230], anchor });
  scene.rings.push({
    x,
    y,
    t0: now,
    dur: big ? 700 : 560,
    maxR: big ? 92 : 64,
    rgb: isMine ? [255, 200, 80] : [255, 90, 60],
    width: 3.5,
    anchor,
  });
  if (big) {
    scene.rings.push({
      x,
      y,
      t0: now + 90,
      dur: 700,
      maxR: 56,
      rgb: [255, 170, 110],
      width: 2,
      anchor,
    });
  }

  // Sparks / debris
  addParticles(scene, big ? 34 : 22, () => {
    const a = rand(0, Math.PI * 2);
    const sp = rand(70, big ? 330 : 260);
    return {
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      age: 0,
      life: rand(0.4, 0.95),
      size: rand(1.4, 3.6),
      grow: -0.4,
      rgb: pick(palette),
      alpha: 1,
      gravity: 260,
      glow: true,
      anchor,
    };
  });

  // Rising smoke
  addParticles(scene, big ? 10 : 6, () => ({
    x: x + rand(-8, 8),
    y: y + rand(-4, 6),
    vx: rand(-14, 14),
    vy: rand(-55, -25),
    age: 0,
    life: rand(1.0, 1.7),
    size: rand(7, 13),
    grow: rand(1.4, 2.2),
    rgb: Math.random() < 0.5 ? SMOKE : SMOKE_LIGHT,
    alpha: 0.5,
    gravity: -8,
    glow: false,
    anchor,
  }));
}

function drawMissile(ctx: CanvasRenderingContext2D, m: Missile, p: number) {
  const t = Math.pow(p, 1.35); // accelerates toward the target
  const pos = bezier(m, t);
  const tan = bezierTangent(m, t);
  const angle = Math.atan2(tan.y, tan.x);
  const scale = 1.75 - 0.6 * p;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Exhaust flame (behind the missile, pointing to -x)
  ctx.globalCompositeOperation = "lighter";
  const flameLen = 20 + Math.random() * 8;
  const flame = ctx.createLinearGradient(-10, 0, -10 - flameLen, 0);
  flame.addColorStop(0, "rgba(255,240,170,0.95)");
  flame.addColorStop(0.45, "rgba(255,130,40,0.7)");
  flame.addColorStop(1, "rgba(255,60,20,0)");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-9, -3.2);
  ctx.lineTo(-10 - flameLen, 0);
  ctx.lineTo(-9, 3.2);
  ctx.closePath();
  ctx.fill();
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
  glow.addColorStop(0, "rgba(255,120,60,0.45)");
  glow.addColorStop(1, "rgba(255,120,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-22, -22, 44, 44);
  ctx.globalCompositeOperation = "source-over";

  // Fins
  ctx.fillStyle = "#a8b7bd";
  ctx.beginPath();
  ctx.moveTo(-9, -3);
  ctx.lineTo(-14, -7.5);
  ctx.lineTo(-5, -3);
  ctx.closePath();
  ctx.moveTo(-9, 3);
  ctx.lineTo(-14, 7.5);
  ctx.lineTo(-5, 3);
  ctx.closePath();
  ctx.fill();

  // Body
  const body = ctx.createLinearGradient(0, -3.5, 0, 3.5);
  body.addColorStop(0, "#f2f6f7");
  body.addColorStop(0.55, "#b3c2c8");
  body.addColorStop(1, "#6f838b");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.rect(-10, -3.4, 18, 6.8);
  ctx.fill();

  // Red nose cone
  ctx.fillStyle = "#ff5a3c";
  ctx.beginPath();
  ctx.moveTo(8, -3.4);
  ctx.quadraticCurveTo(15, -1.8, 17, 0);
  ctx.quadraticCurveTo(15, 1.8, 8, 3.4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function ShotAnimation({
  boardRef,
  targetCell,
  outcome,
  onDone,
  sourceRef,
}: ShotAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene>({
    missiles: [],
    particles: [],
    rings: [],
    flashes: [],
    raf: null,
    last: 0,
  });
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const prev = useRef<{ cell: string | null; outcome: Outcome | null }>({ cell: null, outcome: null });

  const ensureLoop = () => {
    const scene = sceneRef.current;
    if (scene.raf !== null) return;
    scene.last = performance.now();
    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        scene.raf = null;
        return;
      }
      const dt = Math.min(0.05, (now - scene.last) / 1000);
      scene.last = now;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      // How far the target cell has moved since the effect was created (layout shifts, scrolling)
      const shifts = new Map<Anchor, Vec>();
      const shiftOf = (a?: Anchor): Vec => {
        if (!a) return { x: 0, y: 0 };
        let v = shifts.get(a);
        if (!v) {
          const r = a.el.getBoundingClientRect();
          v = { x: r.left + r.width / 2 - a.bx, y: r.top + r.height / 2 - a.by };
          shifts.set(a, v);
        }
        return v;
      };

      // Missiles: draw, emit a smoke trail, land
      for (let i = scene.missiles.length - 1; i >= 0; i--) {
        const m = scene.missiles[i];
        const p = (now - m.t0) / SHOT_FLIGHT_MS;
        // The missile homes in on the cell's current position
        const live = m.el.getBoundingClientRect();
        m.end = { x: live.left + live.width / 2, y: live.top + live.height / 2 };
        if (p >= 1) {
          explode(scene, m.end.x, m.end.y, m.outcome, now, { el: m.el, bx: m.end.x, by: m.end.y });
          scene.missiles.splice(i, 1);
          continue;
        }
        if (p < 0) continue;
        drawMissile(ctx, m, p);
        if (now - m.lastTrail > 16) {
          m.lastTrail = now;
          const t = Math.pow(p, 1.35);
          const pos = bezier(m, t);
          const tan = bezierTangent(m, t);
          const len = Math.hypot(tan.x, tan.y) || 1;
          const tx = pos.x - (tan.x / len) * 14;
          const ty = pos.y - (tan.y / len) * 14;
          addParticles(scene, 1, () => ({
            x: tx + rand(-1.5, 1.5),
            y: ty + rand(-1.5, 1.5),
            vx: rand(-10, 10),
            vy: rand(-12, 6),
            age: 0,
            life: rand(0.35, 0.6),
            size: rand(2.5, 4.5),
            grow: 1.6,
            rgb: Math.random() < 0.35 ? [255, 160, 80] : SMOKE_LIGHT,
            alpha: 0.4,
            gravity: -10,
            glow: false,
          }));
        }
      }

      // Flashes
      for (let i = scene.flashes.length - 1; i >= 0; i--) {
        const f = scene.flashes[i];
        const k = (now - f.t0) / f.dur;
        if (k >= 1) {
          scene.flashes.splice(i, 1);
          continue;
        }
        if (k < 0) continue;
        const r = f.r * (0.4 + 0.9 * k);
        const sh = shiftOf(f.anchor);
        const fx = f.x + sh.x;
        const fy = f.y + sh.y;
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
        g.addColorStop(0, `rgba(${f.rgb[0]},${f.rgb[1]},${f.rgb[2]},${0.9 * (1 - k)})`);
        g.addColorStop(1, `rgba(${f.rgb[0]},${f.rgb[1]},${f.rgb[2]},0)`);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rings
      for (let i = scene.rings.length - 1; i >= 0; i--) {
        const r = scene.rings[i];
        const k = (now - r.t0) / r.dur;
        if (k >= 1) {
          scene.rings.splice(i, 1);
          continue;
        }
        if (k < 0) continue;
        const ease = 1 - Math.pow(1 - k, 2.2);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(${r.rgb[0]},${r.rgb[1]},${r.rgb[2]},${0.85 * (1 - k)})`;
        ctx.lineWidth = r.width * (1 - 0.6 * k);
        ctx.beginPath();
        const rs = shiftOf(r.anchor);
        ctx.arc(r.x + rs.x, r.y + rs.y, r.maxR * ease, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Particles
      for (let i = scene.particles.length - 1; i >= 0; i--) {
        const q = scene.particles[i];
        q.age += dt;
        if (q.age >= q.life) {
          scene.particles.splice(i, 1);
          continue;
        }
        q.vy += q.gravity * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        const k = q.age / q.life;
        const radius = Math.max(0.4, q.size * (1 + q.grow * k));
        const a = q.alpha * (1 - k);
        const qs = shiftOf(q.anchor);
        const qx = q.x + qs.x;
        const qy = q.y + qs.y;
        ctx.globalCompositeOperation = q.glow ? "lighter" : "source-over";
        const g = ctx.createRadialGradient(qx, qy, 0, qx, qy, radius);
        g.addColorStop(0, `rgba(${q.rgb[0]},${q.rgb[1]},${q.rgb[2]},${a})`);
        g.addColorStop(1, `rgba(${q.rgb[0]},${q.rgb[1]},${q.rgb[2]},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(qx, qy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      const alive =
        scene.missiles.length +
          scene.particles.length +
          scene.rings.length +
          scene.flashes.length >
        0;
      if (alive) {
        scene.raf = requestAnimationFrame(loop);
      } else {
        scene.raf = null;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
    };
    scene.raf = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (!targetCell || !outcome) return;
    if (prev.current.cell === targetCell && prev.current.outcome === outcome) return;
    prev.current = { cell: targetCell, outcome };

    const board = boardRef.current;
    const canvas = canvasRef.current;
    const cellBtn = board?.querySelector<HTMLElement>(`button[data-key="${targetCell}"]`);
    if (!board || !canvas || !cellBtn) {
      onDoneRef.current();
      return;
    }

    // Respect reduced-motion: skip the effect, still tell the caller when "impact" would be
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => onDoneRef.current(), SHOT_FLIGHT_MS);
      return () => clearTimeout(t);
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);

    const cellRect = cellBtn.getBoundingClientRect();
    const end = { x: cellRect.left + cellRect.width / 2, y: cellRect.top + cellRect.height / 2 };

    const srcEl = sourceRef?.current;
    let start: Vec;
    if (srcEl) {
      const r = srcEl.getBoundingClientRect();
      start = { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
    } else {
      const r = board.getBoundingClientRect();
      start = { x: r.left - 80, y: r.bottom - 40 };
    }
    // Control point: above the midpoint so the missile arcs through the air
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const ctrl = {
      x: (start.x + end.x) / 2,
      y: Math.min(start.y, end.y) - Math.max(120, dist * 0.35),
    };

    const now = performance.now();
    sceneRef.current.missiles.push({ el: cellBtn, start, ctrl, end, t0: now, outcome, lastTrail: now });
    ensureLoop();

    const t = setTimeout(() => onDoneRef.current(), SHOT_FLIGHT_MS + IMPACT_TAIL_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCell, outcome]);

  // Stop the loop on unmount
  useEffect(() => {
    const scene = sceneRef.current;
    return () => {
      if (scene.raf !== null) cancelAnimationFrame(scene.raf);
      scene.raf = null;
    };
  }, []);

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
        zIndex: 9999,
      }}
    />
  );
}
