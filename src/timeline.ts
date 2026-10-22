import {Easing, interpolate, spring} from 'remotion';
import * as THREE from 'three';
import {
  CELL_H,
  CELL_R,
  CELL_Y,
  CUT_CENTER,
  HERO_LIFT,
  HERO_LOCAL,
  HERO_MODULE,
  LAYERS,
  LAYER_COUNT,
  MODULE_X,
} from './geometry';

export const FPS = 30;
export const DURATION = 1020;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const COLORS = {
  base: '#111318',
  wire: '#3A3F4D',
  cyan: '#00E5FF',
  orange: '#FF6B35',
  green: '#76FF03',
  text: '#D5D9E2',
  dim: '#7D8496',
};

export type Shot = {id: string; from: number; to: number; title: string; sub: string};
export const SHOTS: Shot[] = [
  {id: '01', from: 0, to: 150, title: 'Sealed Pack Exterior', sub: 'Die-cast aluminum frame · 15° orbital sweep'},
  {id: '02', from: 151, to: 300, title: 'Mechanical Cutaway', sub: 'Ballistic shield translates +Z · descent into module group 2'},
  {id: '03', from: 301, to: 510, title: 'Thermal System', sub: 'Serpentine extrusion cold plate · coolant velocity vectors'},
  {id: '04', from: 511, to: 750, title: 'Cell Macro', sub: 'Sliced cylindrical cell · jelly-roll electrode stack · BMS sense'},
  {id: '05', from: 751, to: 1020, title: 'Exploded Isometric', sub: 'HV busbar series path converging on contactor terminals'},
];
export const shotAt = (f: number) => Math.max(0, SHOTS.findIndex((s) => f >= s.from && f <= s.to));

const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ramp = (f: number, a: number, b: number, easing: (t: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], {...CLAMP, easing});
export const windowed = (f: number, a: number, b: number, fade = 12) =>
  Math.min(ramp(f, a, a + fade), 1 - ramp(f, b - fade, b));

// ---------- camera ----------
type Key = {t: [number, number, number]; az: number; el: number; r: number; fov: number};
const HERO_WORLD: [number, number, number] = [MODULE_X[HERO_MODULE] + HERO_LOCAL[0], CELL_Y + HERO_LIFT, HERO_LOCAL[1]];
const ISO_EL = 35.264;
const K: Record<string, Key> = {
  k0: {t: [0, 0.2, 0], az: 26, el: 24, r: 10.2, fov: 30},
  k1: {t: [0, 0.2, 0], az: 41, el: 24, r: 9.3, fov: 30},
  k2: {t: [-0.5, 0.2, 0.15], az: 52, el: 40, r: 2.2, fov: 38},
  k3: {t: [-0.58, 0.06, -0.3], az: 22, el: 54, r: 1.9, fov: 38},
  k4a: {t: [HERO_WORLD[0], HERO_WORLD[1] + 0.02, HERO_WORLD[2]], az: 38, el: 30, r: 0.82, fov: 32},
  k4b: {t: [HERO_WORLD[0], HERO_WORLD[1] + 0.06, HERO_WORLD[2]], az: 64, el: 40, r: 0.66, fov: 30},
  k5: {t: [1.15, 1.1, -0.6], az: 45, el: ISO_EL, r: 19.5, fov: 24},
  k6: {t: [1.15, 1.1, -0.6], az: 45, el: ISO_EL, r: 18.6, fov: 24},
};
type Seg = {a: Key; b: Key; f0: number; f1: number; ease: (t: number) => number};
const SEGS: Seg[] = [
  {a: K.k0, b: K.k1, f0: 0, f1: 150, ease: Easing.inOut(Easing.sin)},
  {a: K.k1, b: K.k2, f0: 162, f1: 300, ease: Easing.inOut(Easing.cubic)},
  {a: K.k2, b: K.k3, f0: 300, f1: 510, ease: Easing.inOut(Easing.sin)},
  {a: K.k3, b: K.k4a, f0: 511, f1: 600, ease: Easing.inOut(Easing.cubic)},
  {a: K.k4a, b: K.k4b, f0: 600, f1: 750, ease: Easing.inOut(Easing.sin)},
  {a: K.k4b, b: K.k5, f0: 751, f1: 840, ease: Easing.bezier(0.7, 0, 0.2, 1)},
  {a: K.k5, b: K.k6, f0: 840, f1: 1020, ease: Easing.linear},
];
const DEG = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type CamState = {position: THREE.Vector3; target: THREE.Vector3; fov: number; near: number};
export const cameraAt = (f: number): CamState => {
  let seg = SEGS[0];
  let t = 0;
  for (const s of SEGS) {
    if (f >= s.f0) {
      seg = s;
      t = s.ease(Math.min(1, (f - s.f0) / (s.f1 - s.f0)));
    }
  }
  const {a, b} = seg;
  const target = new THREE.Vector3(lerp(a.t[0], b.t[0], t), lerp(a.t[1], b.t[1], t), lerp(a.t[2], b.t[2], t));
  const r = Math.exp(lerp(Math.log(a.r), Math.log(b.r), t));
  const az = lerp(a.az, b.az, t) * DEG;
  const el = lerp(a.el, b.el, t) * DEG;
  const position = target
    .clone()
    .add(new THREE.Vector3(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az)));
  return {position, target, fov: lerp(a.fov, b.fov, t), near: Math.max(0.004, r * 0.02)};
};

// ---------- scene state ----------
export const sceneAt = (f: number) => {
  const explode = ramp(f, 760, 880);
  const shieldSpring = spring({frame: f - 160, fps: FPS, config: {damping: 22, stiffness: 50, mass: 1.4}});
  let ghost = 1 - 0.86 * ramp(f, 305, 345);
  ghost += 0.2 * ramp(f, 515, 560);
  ghost += (1 - ghost) * ramp(f, 752, 800);
  const coolant = ramp(f, 305, 345);
  return {
    explode,
    shieldLift: shieldSpring * 2.3 + explode * 0.5,
    shieldOpacity: 1 - 0.9 * ramp(f, 175, 250),
    ghost,
    coolant,
    coolantGlow: coolant * (1 - 0.45 * ramp(f, 511, 560)),
    arrows: ramp(f, 330, 370) * (1 - 0.55 * ramp(f, 511, 545)),
    heroLift: HERO_LIFT * ramp(f, 520, 585) * (1 - ramp(f, 752, 800)),
    capLift: 0.13 * ramp(f, 588, 615) * (1 - ramp(f, 752, 770)),
    jellyVisible: f >= 585 && f <= 772,
    macroLight: ramp(f, 540, 600) * (1 - ramp(f, 752, 790)),
    bms: (i: number) => ramp(f, 565 + i * 14, 625 + i * 14),
    heroSense: ramp(f, 600, 650) * (1 - ramp(f, 752, 775)),
    busbar: ramp(f, 835, 880),
    converge: ramp(f, 880, 985, Easing.inOut(Easing.quad)),
    contactor: ramp(f, 985, 1002),
  };
};
export type SceneState = ReturnType<typeof sceneAt>;

const sliceAt = (f: number) => ramp(f, 588, 625) * (1 - ramp(f, 752, 770));
const peelAt = (f: number, j: number) =>
  ramp(f, 625 + (LAYER_COUNT - 1 - j) * 1.6, 672 + (LAYER_COUNT - 1 - j) * 1.6) * (1 - ramp(f, 752, 770));

// Wedge cut faces CUT_CENTER; outer wraps open wider so the stack reads as a staircase.
export const layerAt = (f: number, j: number) => {
  const kOut = j / (LAYER_COUNT - 1);
  const peel = peelAt(f, j);
  const half = sliceAt(f) * (Math.PI / 4) + peel * kOut * Math.PI * 0.42;
  const r = LAYERS[j].r + peel * kOut * kOut * 0.012;
  return {r, thetaStart: CUT_CENTER + half, thetaLength: Math.PI * 2 - 2 * half};
};
export const casingAt = (f: number) => {
  const peel = peelAt(f, LAYER_COUNT - 1);
  const half = sliceAt(f) * (Math.PI / 4) + peel * Math.PI * 0.45;
  return {r: CELL_R + peel * 0.016, thetaStart: CUT_CENTER + half, thetaLength: Math.PI * 2 - 2 * half};
};

// World-space point on a layer's cut edge, used by HUD callouts.
export const layerEdgeWorld = (f: number, j: number, y: number) => {
  const l = layerAt(f, j);
  const st = sceneAt(f);
  return new THREE.Vector3(
    MODULE_X[HERO_MODULE] + HERO_LOCAL[0] + l.r * Math.sin(l.thetaStart),
    CELL_Y + st.heroLift + y,
    HERO_LOCAL[1] + l.r * Math.cos(l.thetaStart),
  );
};
export const heroCapWorld = (f: number) =>
  new THREE.Vector3(
    MODULE_X[HERO_MODULE] + HERO_LOCAL[0],
    CELL_Y + sceneAt(f).heroLift + CELL_H / 2 + sceneAt(f).capLift + 0.01,
    HERO_LOCAL[1],
  );

const projCam = new THREE.PerspectiveCamera();
export const project = (f: number, v: THREE.Vector3, w = WIDTH, h = HEIGHT) => {
  const c = cameraAt(f);
  projCam.fov = c.fov;
  projCam.aspect = w / h;
  projCam.near = c.near;
  projCam.far = 200;
  projCam.position.copy(c.position);
  projCam.lookAt(c.target);
  projCam.updateProjectionMatrix();
  projCam.updateMatrixWorld();
  const p = v.clone().project(projCam);
  return {x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, visible: p.z > -1 && p.z < 1};
};
