import type { ShipType } from "@/types/game";

export function shipSVG(type: ShipType, n: number, vert: boolean): string {
  const W = n * 10;
  const B = W - 4.2;

  const hull = `<path class="h" d="M1.2 1.6H${B}L${W - 0.4} 5L${B} 8.4H1.2Q.2 8.4 .2 7.2V2.8Q.2 1.6 1.2 1.6Z"/><path class="d" d="M2 2.8H${B - 0.6}L${W - 2.6} 5L${B - 0.6} 7.2H2Z"/>`;
  const tur = (x: number) =>
    `<circle class="k" cx="${x}" cy="5" r="1.9"/><rect class="w" x="${x + 1}" y="4.7" width="3.4" height=".6"/>`;
  const bridge = (x: number, w: number) =>
    `<rect class="k" x="${x}" y="3.5" width="${w}" height="3" rx=".7"/><rect class="w" x="${x + 0.8}" y="4.6" width="${w - 1.6}" height=".8"/>`;
  const funnel = (x: number) =>
    `<ellipse class="w" cx="${x}" cy="5" rx="1.2" ry="1.5"/>`;
  const plane = (x: number) =>
    `<path class="w" d="M${x} 4.7h3v.8h-3zM${x + 1} 3.5h.8v3h-.8z"/>`;

  let g: string;

  if (type === "carrier") {
    g = `<path class="h" d="M1.2 1.1H${B}L${W - 0.4} 5L${B} 8.9H1.2Q.2 8.9 .2 7.7V2.3Q.2 1.1 1.2 1.1Z"/><path class="d" d="M2 2H${B - 0.6}L${W - 2.6} 5L${B - 0.6} 8H2Z"/><path d="M4 5H${W - 7}" stroke="#e1eff0" stroke-width=".4" stroke-dasharray="2 1.6" fill="none"/>${plane(8)}${plane(16)}${plane(24)}<rect class="k" x="${W - 19}" y="1.5" width="7" height="2.3" rx=".6"/><rect class="w" x="${W - 17.6}" y="2.1" width="3" height="1"/>`;
  } else if (type === "battleship") {
    g = hull + tur(7) + tur(14) + tur(W - 12) + bridge(20, 5) + funnel(28);
  } else if (type === "cruiser") {
    g = hull + tur(6) + tur(W - 9) + bridge(12, 4) + funnel(19);
  } else if (type === "submarine") {
    g = `<rect class="h" x=".4" y="2.2" width="${W - 0.8}" height="5.6" rx="2.8"/><rect class="d" x="3" y="4.6" width="${W - 6}" height=".8" rx=".4"/><rect class="k" x="${W / 2 - 4}" y="3" width="7" height="4" rx="1.4"/><rect class="w" x="${W / 2 - 0.4}" y="1.8" width=".6" height="1.8"/><rect class="w" x="${W / 2 - 3}" y="4.4" width="3.5" height="1.2" rx=".5"/>`;
  } else {
    // destroyer
    g = hull + tur(5) + bridge(9, 4) + funnel(15);
  }

  if (vert) {
    return `<svg viewBox="0 0 10 ${W}" preserveAspectRatio="none"><g transform="translate(10 0) rotate(90)">${g}</g></svg>`;
  }
  return `<svg viewBox="0 0 ${W} 10" preserveAspectRatio="none">${g}</svg>`;
}
