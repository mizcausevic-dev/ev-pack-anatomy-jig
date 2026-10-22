import * as THREE from 'three';

// World units are arbitrary "pack metres". Three.js is Y-up, so the brief's
// engineering +Z (shield lift) maps to +Y here.
export const HX = 2.2;
export const HZ = 1.3;
export const PACK_H = 0.55;

export const MODULE_X = [-1.5, -0.5, 0.5, 1.5];
export const HERO_MODULE = 1;

export const CELL_R = 0.045;
export const CELL_H = 0.34;
export const PITCH = 0.104;
export const COLS = 8;
export const ROWS = 20;
export const CELL_Y = 0.07 + CELL_H / 2;
export const CELL_TOP = 0.07 + CELL_H;

export const HERO = {c: 4, r: 12};
export const cellLocal = (c: number, r: number): [number, number] => [
  (c - (COLS - 1) / 2) * PITCH,
  (r - (ROWS - 1) / 2) * PITCH,
];
export const HERO_LOCAL = cellLocal(HERO.c, HERO.r);
export const HERO_LIFT = 0.55;

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------- exploded-view transforms (e = explode progress 0..1) ----------
export const modX = (i: number, e: number) => MODULE_X[i] * (1 + 0.45 * e);
export const modY = (e: number) => 0.9 * e;
export const plateLayerY = (e: number) => -0.45 * e;
export const busLayerY = (e: number) => 0.15 * e;
export const bmsLayerY = (e: number) => 0.3 * e;
export const trayY = (e: number) => -0.9 * e;
export const boxPos = (e: number) => V(2.035 + 1.0 * e, 0.25 + 1.05 * e, 0);

// ---------- serpentine coolant channel (module-local) ----------
type Serp = {curve: THREE.CatmullRomCurve3; pts: THREE.Vector3[]; tans: THREE.Vector3[]; length: number};
let serpCache: Serp | null = null;
export const SERP_Y = 0.052;
export const serpentine = (): Serp => {
  if (serpCache) return serpCache;
  const pts: THREE.Vector3[] = [];
  const zEnd = 0.99;
  const rT = PITCH / 2;
  const x = (i: number) => (i - (COLS - 1) / 2) * PITCH;
  pts.push(V(x(0), SERP_Y, -1.17));
  for (let i = 0; i < COLS; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const zA = -dir * zEnd;
    const zB = dir * zEnd;
    for (let s = 0; s <= 16; s++) pts.push(V(x(i), SERP_Y, zA + ((zB - zA) * s) / 16));
    if (i < COLS - 1) {
      for (let s = 1; s < 10; s++) {
        const a = (Math.PI * s) / 10;
        pts.push(V(x(i) + rT - rT * Math.cos(a), SERP_Y, zB + dir * rT * Math.sin(a)));
      }
    }
  }
  pts.push(V(x(COLS - 1), SERP_Y, -1.23));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  curve.arcLengthDivisions = 3000;
  const N = 1200;
  const sp: THREE.Vector3[] = [];
  const tans: THREE.Vector3[] = [];
  for (let k = 0; k <= N; k++) {
    sp.push(curve.getPointAt(k / N));
    tans.push(curve.getTangentAt(k / N));
  }
  serpCache = {curve, pts: sp, tans, length: curve.getLength()};
  return serpCache;
};
export const serpAt = (u: number) => {
  const s = serpentine();
  const k = Math.max(0, Math.min(s.pts.length - 1, Math.round((((u % 1) + 1) % 1) * (s.pts.length - 1))));
  return {p: s.pts[k], t: s.tans[k]};
};

// ---------- HV series chain (world space) ----------
export type ChainPoint = {p: THREE.Vector3; visibleFromPrev: boolean; s: number};
export const moduleTerminal = (i: number, e: number, sign: -1 | 1) =>
  V(modX(i, e) + sign * 0.4, modY(e) + busLayerY(e) + 0.44, -1.07);

export const contactorPos = (e: number, sign: -1 | 1) => boxPos(e).add(V(0, 0.06, sign * 0.22));
export const postTip = (e: number, sign: -1 | 1) => boxPos(e).add(V(0.36, 0, sign * 0.22));
export const bmsMasterPos = (e: number) => boxPos(e).add(V(0, 0.185, 0.3));

export type Chain = {points: ChainPoint[]; center: number; moduleS: number[]};
export const chainAt = (e: number): Chain => {
  const raw: {p: THREE.Vector3; vis: boolean; mod?: number}[] = [];
  const cM = contactorPos(e, -1);
  const cP = contactorPos(e, 1);
  const yR = modY(e) + busLayerY(e) + 0.5;
  raw.push({p: postTip(e, -1), vis: true});
  raw.push({p: cM, vis: true});
  raw.push({p: V(cM.x, yR, -1.14), vis: true});
  raw.push({p: V(moduleTerminal(0, e, -1).x, yR, -1.14), vis: true});
  raw.push({p: moduleTerminal(0, e, -1), vis: true});
  for (let i = 0; i < 4; i++) {
    raw.push({p: moduleTerminal(i, e, 1), vis: false, mod: i});
    if (i < 3) raw.push({p: moduleTerminal(i + 1, e, -1), vis: true});
  }
  const t3 = moduleTerminal(3, e, 1);
  raw.push({p: V(cP.x, t3.y, -1.07), vis: true});
  raw.push({p: V(cP.x, t3.y, 0.22), vis: true});
  raw.push({p: cP, vis: true});
  raw.push({p: postTip(e, 1), vis: true});

  const cum = [0];
  for (let k = 1; k < raw.length; k++) cum.push(cum[k - 1] + raw[k].p.distanceTo(raw[k - 1].p));
  const total = cum[cum.length - 1];
  const points = raw.map((r, k) => ({p: r.p, visibleFromPrev: k > 0 && r.vis, s: cum[k] / total}));
  const moduleS: number[] = [];
  raw.forEach((r, k) => {
    if (r.mod !== undefined) moduleS[r.mod] = (points[k].s + points[k - 1].s) / 2;
  });
  // Series midpoint: the busbar joining module 2 and module 3 (indices 1 -> 2).
  const midIdx = raw.findIndex((r, k) => k > 0 && raw[k - 1].mod === 1);
  const center = (points[midIdx].s + points[midIdx - 1].s) / 2;
  return {points, center, moduleS};
};

export const chainPointAt = (chain: Chain, s: number) => {
  const pts = chain.points;
  for (let k = 1; k < pts.length; k++) {
    if (s <= pts[k].s) {
      const span = pts[k].s - pts[k - 1].s || 1;
      return pts[k - 1].p.clone().lerp(pts[k].p, (s - pts[k - 1].s) / span);
    }
  }
  return pts[pts.length - 1].p.clone();
};

// Normalised distance from the series midpoint toward either terminal (0 at middle, 1 at a terminal).
export const frontDistance = (chain: Chain, s: number) =>
  s < chain.center ? (chain.center - s) / chain.center : (s - chain.center) / (1 - chain.center);

// ---------- jelly-roll layers ----------
export type LayerType = 'cathode' | 'separator' | 'anode';
export const LAYER_COUNT = 32;
export const LAYERS: {j: number; type: LayerType; r: number}[] = Array.from({length: LAYER_COUNT}, (_, j) => ({
  j,
  type: (['cathode', 'separator', 'anode', 'separator'] as const)[j % 4],
  r: 0.008 + (j * 0.0355) / (LAYER_COUNT - 1),
}));
export const CUT_CENTER = (55 * Math.PI) / 180;
