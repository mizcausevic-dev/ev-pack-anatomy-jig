import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as loadGrotesk} from '@remotion/google-fonts/SpaceGrotesk';
import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import * as THREE from 'three';
import {
  HERO_MODULE,
  HX,
  HZ,
  MODULE_X,
  PACK_H,
  V,
  bmsMasterPos,
  contactorPos,
  modX,
  modY,
  postTip,
  serpAt,
} from './geometry';
import {
  COLORS,
  DURATION,
  FPS,
  HEIGHT,
  SHOTS,
  WIDTH,
  heroCapWorld,
  layerEdgeWorld,
  project,
  ramp,
  sceneAt,
  shotAt,
  windowed,
} from './timeline';

const {fontFamily: MONO} = loadMono('normal', {weights: ['400', '600'], subsets: ['latin']});
const {fontFamily: GROTESK} = loadGrotesk('normal', {weights: ['500', '700'], subsets: ['latin']});

type Callout = {
  from: number;
  to: number;
  at: (f: number) => THREE.Vector3;
  label: string;
  sub?: string;
  color: string;
  dx: number;
  dy: number;
};

const heroModuleX = MODULE_X[HERO_MODULE];
const CALLOUTS: Callout[] = [
  {from: 18, to: 150, at: () => V(HX, PACK_H * 0.55, HZ), label: 'DIE-CAST AL FRAME', sub: 'structural enclosure · load path', color: COLORS.text, dx: -230, dy: 120},
  {from: 40, to: 150, at: () => postTip(0, 1), label: 'HV CONNECTOR', sub: 'pack output terminals', color: COLORS.cyan, dx: 160, dy: -90},
  {from: 62, to: 150, at: () => V(-0.6, PACK_H + 0.04, -0.3), label: 'BALLISTIC SHIELD', sub: 'underbody impact plate', color: COLORS.text, dx: -150, dy: -140},
  {from: 175, to: 290, at: (f) => V(0.8, PACK_H + 0.04 + sceneAt(f).shieldLift, 0.6), label: 'SHIELD  +Z TRANSLATION', sub: 'Δz = +2.30 jig units', color: COLORS.text, dx: 180, dy: -60},
  {from: 225, to: 300, at: () => V(heroModuleX, 0.42, 1.0), label: 'MODULE GROUP 2', sub: '8 × 20 cylindrical cells', color: COLORS.text, dx: 170, dy: 90},
  {from: 330, to: 505, at: () => serpAt(0.31).p.clone().add(V(heroModuleX, 0, 0)), label: 'SERPENTINE EXTRUSION CHANNEL', sub: 'cold plate · single-pass loop', color: COLORS.orange, dx: 200, dy: -150},
  {from: 360, to: 505, at: () => V(heroModuleX - 0.2, 0.06, -1.17), label: 'SUPPLY / RETURN MANIFOLD', sub: 'inlet → outlet', color: COLORS.orange, dx: -260, dy: 110},
  {from: 395, to: 505, at: () => serpAt(0.62).p.clone().add(V(heroModuleX, 0.03, 0)), label: 'COOLANT VELOCITY VECTORS', sub: 'arrow = flow direction', color: COLORS.orange, dx: 220, dy: 80},
  {from: 545, to: 625, at: (f) => heroCapWorld(f), label: 'CELL M2 · C4 · R12', sub: 'extracted for section', color: COLORS.text, dx: 180, dy: -120},
  {from: 650, to: 748, at: (f) => layerEdgeWorld(f, 28, 0.1), label: 'CATHODE', sub: 'coated aluminum foil', color: '#B9C4DA', dx: -300, dy: -140},
  {from: 660, to: 748, at: (f) => layerEdgeWorld(f, 25, 0.0), label: 'SEPARATOR', sub: 'porous polymer film', color: '#EEF1F6', dx: 260, dy: 60},
  {from: 670, to: 748, at: (f) => layerEdgeWorld(f, 22, -0.1), label: 'ANODE', sub: 'coated copper foil', color: '#D08A5E', dx: -280, dy: -70},
  {from: 625, to: 748, at: (f) => heroCapWorld(f).add(V(0, 0.02, 0)), label: 'BMS SENSE LEAD', sub: 'cell voltage + temperature tap', color: COLORS.green, dx: 240, dy: -120},
  {from: 900, to: 1020, at: () => contactorPos(1, 1), label: 'HV+ CONTACTOR', sub: 'positive terminal', color: COLORS.cyan, dx: 90, dy: 190},
  {from: 910, to: 1020, at: () => contactorPos(1, -1), label: 'HV− CONTACTOR', sub: 'negative terminal', color: COLORS.cyan, dx: 240, dy: 120},
  {from: 920, to: 1020, at: () => bmsMasterPos(1), label: 'BMS MASTER', sub: 'daisy-chain head', color: COLORS.green, dx: -120, dy: -330},
  {from: 870, to: 1020, at: () => V((modX(1, 1) + modX(2, 1)) / 2, modY(1) + 0.15 + 0.44, -1.07), label: 'SERIES BUSBAR', sub: 'module 2 → module 3', color: COLORS.cyan, dx: -260, dy: 240},
];

const CalloutView: React.FC<{f: number; c: Callout}> = ({f, c}) => {
  const o = windowed(f, c.from, c.to, 10);
  if (o <= 0.001) return null;
  const p = project(f, c.at(f));
  if (!p.visible) return null;
  const draw = ramp(f, c.from, c.from + 12);
  const lx = p.x + c.dx * draw;
  const ly = p.y + c.dy * draw;
  const right = c.dx >= 0;
  return (
    <>
      <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0, opacity: o}}>
        <circle cx={p.x} cy={p.y} r={5} fill="none" stroke={c.color} strokeWidth={1.5} />
        <circle cx={p.x} cy={p.y} r={2} fill={c.color} />
        <polyline
          points={`${p.x},${p.y} ${lx},${ly} ${lx + (right ? 36 : -36)},${ly}`}
          fill="none"
          stroke={c.color}
          strokeWidth={1.25}
          strokeOpacity={0.9}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: right ? lx + 44 : undefined,
          right: right ? undefined : WIDTH - lx + 44,
          top: ly - 16,
          opacity: o,
          transform: `translateX(${(1 - draw) * (right ? -12 : 12)}px)`,
          textAlign: right ? 'left' : 'right',
          fontFamily: MONO,
        }}
      >
        <div style={{color: c.color, fontSize: 19, fontWeight: 600, letterSpacing: 2}}>{c.label}</div>
        {c.sub && <div style={{color: COLORS.dim, fontSize: 14, letterSpacing: 1, marginTop: 4}}>{c.sub}</div>}
      </div>
    </>
  );
};

const Corner: React.FC<{x: 'left' | 'right'; y: 'top' | 'bottom'}> = ({x, y}) => (
  <div
    style={{
      position: 'absolute',
      [x]: 36,
      [y]: 36,
      width: 34,
      height: 34,
      borderColor: COLORS.wire,
      borderStyle: 'solid',
      borderWidth: 0,
      [`border${y === 'top' ? 'Top' : 'Bottom'}Width`]: 2,
      [`border${x === 'left' ? 'Left' : 'Right'}Width`]: 2,
    }}
  />
);

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');

const TitleBlock: React.FC<{f: number}> = ({f}) => {
  const i = shotAt(f);
  const shot = SHOTS[i];
  const local = f - shot.from;
  const inT = ramp(local, 0, 16);
  const out = i < SHOTS.length - 1 ? 1 - ramp(f, shot.to - 10, shot.to) : 1;
  return (
    <div style={{position: 'absolute', left: 84, top: 76, fontFamily: MONO}}>
      <div style={{color: COLORS.cyan, fontSize: 15, letterSpacing: 5}}>EV BATTERY PACK // ANATOMY JIG</div>
      <div style={{opacity: inT * out, transform: `translateY(${(1 - inT) * 18}px)`}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 14}}>
          <span style={{color: COLORS.dim, fontSize: 22}}>{shot.id}</span>
          <span style={{color: '#F2F4F8', fontFamily: GROTESK, fontWeight: 700, fontSize: 50, letterSpacing: -0.5}}>{shot.title}</span>
        </div>
        <div style={{color: COLORS.text, fontSize: 17, marginTop: 8, letterSpacing: 0.5}}>{shot.sub}</div>
      </div>
    </div>
  );
};

const TopRight: React.FC<{f: number}> = ({f}) => {
  const sec = f / FPS;
  const load = 0.78 + 0.04 * Math.sin(f / 9);
  return (
    <div style={{position: 'absolute', right: 84, top: 76, fontFamily: MONO, textAlign: 'right', color: COLORS.text}}>
      <div style={{fontSize: 30, color: '#F2F4F8', letterSpacing: 2}}>
        T+{pad(sec)}:{pad(f % FPS)}
      </div>
      <div style={{fontSize: 14, color: COLORS.dim, marginTop: 6, letterSpacing: 2}}>
        FRAME {pad(f, 4)} / {DURATION} · 30 FPS
      </div>
      <div style={{marginTop: 18, fontSize: 13, letterSpacing: 2, color: COLORS.dim}}>LOAD PROFILE · DC FAST CHARGE</div>
      <div style={{marginTop: 8, marginLeft: 'auto', width: 260, height: 6, background: '#1D2129', border: `1px solid ${COLORS.wire}`}}>
        <div style={{width: `${load * 100}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.orange})`}} />
      </div>
    </div>
  );
};

const Timeline: React.FC<{f: number}> = ({f}) => {
  const left = 84;
  const width = WIDTH - 168;
  return (
    <div style={{position: 'absolute', left, bottom: 70, width, fontFamily: MONO}}>
      <div style={{display: 'flex', gap: 6}}>
        {SHOTS.map((s, k) => {
          const span = s.to - s.from + 1;
          const fill = interpolate(f, [s.from, s.to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const active = shotAt(f) === k;
          return (
            <div key={s.id} style={{flex: span}}>
              <div style={{height: 4, background: '#1D2129', position: 'relative'}}>
                <div style={{position: 'absolute', inset: 0, width: `${fill * 100}%`, background: active ? COLORS.cyan : '#4A5162'}} />
              </div>
              <div style={{marginTop: 10, fontSize: 12, letterSpacing: 2, color: active ? '#F2F4F8' : COLORS.dim}}>
                {s.id} {s.title.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Legend: React.FC = () => (
  <div style={{position: 'absolute', left: 84, bottom: 132, fontFamily: MONO, fontSize: 13, letterSpacing: 2, display: 'flex', gap: 28}}>
    {[
      [COLORS.cyan, 'HV BUSBAR'],
      [COLORS.orange, 'COOLANT'],
      [COLORS.green, 'BMS TELEMETRY'],
      [COLORS.wire, 'STRUCTURE'],
    ].map(([c, l]) => (
      <div key={l} style={{display: 'flex', alignItems: 'center', gap: 10, color: COLORS.text}}>
        <span style={{width: 22, height: 3, background: c, boxShadow: c === COLORS.wire ? 'none' : `0 0 8px ${c}`}} />
        {l}
      </div>
    ))}
  </div>
);

const Row: React.FC<{k: string; v: string; c?: string}> = ({k, v, c = '#F2F4F8'}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', gap: 30, padding: '6px 0', borderBottom: `1px solid ${COLORS.wire}`}}>
    <span style={{color: COLORS.dim}}>{k}</span>
    <span style={{color: c}}>{v}</span>
  </div>
);

const Telemetry: React.FC<{f: number}> = ({f}) => {
  const o = windowed(f, 575, 1020, 14);
  if (o <= 0.001) return null;
  const st = sceneAt(f);
  const cellV = interpolate(f, [575, 1020], [3.71, 4.02], {extrapolateRight: 'clamp'});
  const cellT = interpolate(f, [575, 1020], [31.2, 36.4], {extrapolateRight: 'clamp'});
  const outT = interpolate(f, [575, 1020], [27.0, 31.5], {extrapolateRight: 'clamp'});
  const soc = interpolate(f, [575, 1020], [24, 61], {extrapolateRight: 'clamp'});
  const packV = 398.4 * st.converge;
  const closed = st.contactor > 0.5;
  return (
    <div
      style={{
        position: 'absolute',
        right: 84,
        top: 250,
        width: 410,
        fontFamily: MONO,
        fontSize: 15,
        letterSpacing: 1,
        opacity: o,
        padding: '18px 22px',
        background: 'rgba(17,19,24,0.72)',
        border: `1px solid ${COLORS.wire}`,
        borderLeft: `3px solid ${COLORS.green}`,
      }}
    >
      <div style={{color: COLORS.green, letterSpacing: 3, fontSize: 13, marginBottom: 10}}>BMS TELEMETRY · CELL M2-C4-R12</div>
      <Row k="CELL VOLTAGE" v={`${cellV.toFixed(3)} V`} c={COLORS.green} />
      <Row k="CELL TEMP" v={`${cellT.toFixed(1)} °C`} />
      <Row k="COOLANT IN / OUT" v={`24.0 / ${outT.toFixed(1)} °C`} c={COLORS.orange} />
      <Row k="STATE OF CHARGE" v={`${soc.toFixed(0)} %`} />
      {f >= 860 && (
        <div style={{marginTop: 18, opacity: ramp(f, 860, 880)}}>
          <div style={{color: COLORS.cyan, letterSpacing: 3, fontSize: 13}}>PACK BUS · Σ 4 MODULES IN SERIES</div>
          <div style={{color: '#F2F4F8', fontFamily: GROTESK, fontWeight: 700, fontSize: 54, marginTop: 6, textShadow: `0 0 18px ${COLORS.cyan}66`}}>
            {packV.toFixed(1)}
            <span style={{fontSize: 24, color: COLORS.cyan, marginLeft: 8}}>V</span>
          </div>
          <div style={{marginTop: 6, color: closed ? COLORS.cyan : COLORS.dim, letterSpacing: 3}}>
            CONTACTORS · {closed ? 'CLOSED' : 'OPEN'}
          </div>
        </div>
      )}
      <div style={{marginTop: 14, color: COLORS.dim, fontSize: 11, letterSpacing: 1.5}}>ILLUSTRATIVE VALUES · TIME-COMPRESSED · NOT MEASURED</div>
    </div>
  );
};

export const Hud: React.FC<{f: number}> = ({f}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(rgba(58,63,77,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(58,63,77,0.10) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }}
    />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(8,9,12,0.75) 100%)'}} />
    <Corner x="left" y="top" />
    <Corner x="right" y="top" />
    <Corner x="left" y="bottom" />
    <Corner x="right" y="bottom" />
    {CALLOUTS.map((c, k) => (
      <CalloutView key={k} f={f} c={c} />
    ))}
    <TitleBlock f={f} />
    <TopRight f={f} />
    <Telemetry f={f} />
    <Legend />
    <Timeline f={f} />
  </AbsoluteFill>
);