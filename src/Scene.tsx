import {useThree} from '@react-three/fiber';
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {
  CELL_H,
  CELL_R,
  CELL_TOP,
  CELL_Y,
  COLS,
  HERO,
  HERO_LOCAL,
  HERO_MODULE,
  HX,
  HZ,
  LAYERS,
  MODULE_X,
  PACK_H,
  PITCH,
  ROWS,
  V,
  bmsLayerY,
  bmsMasterPos,
  boxPos,
  busLayerY,
  cellLocal,
  chainAt,
  chainPointAt,
  frontDistance,
  modX,
  modY,
  plateLayerY,
  serpAt,
  serpentine,
  trayY,
  type Chain,
} from './geometry';
import {COLORS, cameraAt, casingAt, layerAt, sceneAt, type CamState, type SceneState} from './timeline';

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const CameraRig: React.FC<{f: number; cam?: CamState}> = ({f, cam}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const c = cam ?? cameraAt(f);
  camera.position.copy(c.position);
  camera.fov = c.fov;
  camera.near = c.near;
  camera.far = 200;
  camera.lookAt(c.target);
  camera.updateProjectionMatrix();
  return null;
};

// ---------- primitives ----------
const WireBox: React.FC<{size: [number, number, number]; position?: [number, number, number]; color?: string; opacity?: number}> = ({
  size,
  position = [0, 0, 0],
  color = COLORS.wire,
  opacity = 1,
}) => {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size[0], size[1], size[2]]);
  return (
    <lineSegments position={position} geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </lineSegments>
  );
};

const Metal: React.FC<{color?: string; opacity?: number; roughness?: number; metalness?: number}> = ({
  color = '#2A2F3A',
  opacity = 1,
  roughness = 0.42,
  metalness = 0.82,
}) => (
  <meshStandardMaterial
    color={color}
    roughness={roughness}
    metalness={metalness}
    transparent={opacity < 1}
    opacity={opacity}
    depthWrite={opacity > 0.6}
  />
);

const SolidBox: React.FC<{
  size: [number, number, number];
  position: [number, number, number];
  color?: string;
  opacity?: number;
  edge?: boolean;
  edgeOpacity?: number;
}> = ({size, position, color, opacity = 1, edge = true, edgeOpacity = 1}) => (
  <group position={position}>
    {opacity > 0.01 && (
      <mesh>
        <boxGeometry args={size} />
        <Metal color={color} opacity={opacity} />
      </mesh>
    )}
    {edge && <WireBox size={size} opacity={edgeOpacity} />}
  </group>
);

const Bar: React.FC<{
  a: THREE.Vector3;
  b: THREE.Vector3;
  w?: number;
  h?: number;
  color: string;
  glow?: number;
  base?: number;
  opacity?: number;
  body?: string;
}> = ({a, b, w = 0.02, h = 0.02, color, glow = 0, base = 0.25, opacity = 1, body = '#0B0E13'}) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  if (len < 1e-5) return null;
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(X_AXIS, d.normalize());
  return (
    <group position={mid} quaternion={q}>
      <mesh>
        <boxGeometry args={[len, h, w]} />
        <meshStandardMaterial
          color={body}
          metalness={0.7}
          roughness={0.4}
          emissive={color}
          emissiveIntensity={base + glow * 2.4}
          toneMapped={false}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {glow > 0.01 && (
        <mesh>
          <boxGeometry args={[len + h * 1.5, h * 3.4, w * 3.4]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18 * glow * opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
};

const Pulse: React.FC<{p: THREE.Vector3; color: string; size?: number; opacity?: number}> = ({p, color, size = 0.018, opacity = 1}) =>
  opacity < 0.01 ? null : (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[size, 12, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={opacity} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 2.6, 12, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.35 * opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );

// ---------- enclosure ----------
const FrameTray: React.FC<{st: SceneState}> = ({st}) => {
  const wallH = PACK_H;
  const t = 0.08;
  const tabs: [number, number][] = [
    [-1.6, 1],
    [0, 1],
    [1.6, 1],
    [-1.6, -1],
    [0, -1],
    [1.6, -1],
  ];
  return (
    <group position={[0, trayY(st.explode), 0]}>
      <SolidBox size={[HX * 2, 0.03, HZ * 2]} position={[0, 0, 0]} color="#191C23" />
      <SolidBox size={[t, wallH, HZ * 2]} position={[HX - t / 2, wallH / 2, 0]} />
      <SolidBox size={[t, wallH, HZ * 2]} position={[-HX + t / 2, wallH / 2, 0]} />
      <SolidBox size={[HX * 2, wallH, t]} position={[0, wallH / 2, HZ - t / 2]} />
      <SolidBox size={[HX * 2, wallH, t]} position={[0, wallH / 2, -HZ + t / 2]} />
      {[-1, 0, 1].map((x) => (
        <SolidBox key={x} size={[0.05, 0.3, HZ * 2 - 0.16]} position={[x, 0.15, 0]} color="#232832" />
      ))}
      {tabs.map(([x, s], k) => (
        <SolidBox key={k} size={[0.28, 0.06, 0.12]} position={[x, 0.08, s * (HZ + 0.06)]} color="#262B35" />
      ))}
      <WireBox size={[HX * 2 + 0.06, wallH + 0.04, HZ * 2 + 0.06]} position={[0, wallH / 2, 0]} opacity={0.45} />
    </group>
  );
};

const Shield: React.FC<{st: SceneState}> = ({st}) => {
  const y = PACK_H + 0.0175 + st.shieldLift;
  const o = st.shieldOpacity;
  return (
    <group position={[0, y, 0]}>
      <SolidBox size={[HX * 2, 0.035, HZ * 2]} position={[0, 0, 0]} color="#1C2029" opacity={o} edgeOpacity={0.6 + 0.4 * o} />
      {[-1.6, -0.8, 0, 0.8, 1.6].map((x) => (
        <SolidBox key={x} size={[0.06, 0.03, HZ * 2 - 0.2]} position={[x, 0.032, 0]} color="#252A34" opacity={o} edgeOpacity={0.5} />
      ))}
      <SolidBox size={[HX * 2 - 0.2, 0.03, 0.06]} position={[0, 0.032, 0]} color="#252A34" opacity={o} edgeOpacity={0.5} />
    </group>
  );
};

// ---------- module internals ----------
const cellGeo = new THREE.CylinderGeometry(CELL_R, CELL_R, CELL_H, 22);
const capGeo = new THREE.CylinderGeometry(CELL_R * 0.62, CELL_R * 0.62, 0.006, 16);

const CellArray: React.FC<{moduleIndex: number; opacity: number}> = ({moduleIndex, opacity}) => {
  const body = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => {
    const out: [number, number][] = [];
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        if (moduleIndex === HERO_MODULE && c === HERO.c && r === HERO.r) continue;
        out.push(cellLocal(c, r));
      }
    return out;
  }, [moduleIndex]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    positions.forEach(([x, z], k) => {
      m.makeTranslation(x, CELL_Y, z);
      body.current!.setMatrixAt(k, m);
      m.makeTranslation(x, CELL_TOP + 0.003, z);
      caps.current!.setMatrixAt(k, m);
    });
    body.current!.instanceMatrix.needsUpdate = true;
    caps.current!.instanceMatrix.needsUpdate = true;
  }, [positions]);
  return (
    <group>
      <instancedMesh ref={body} args={[cellGeo, undefined, positions.length]}>
        <meshStandardMaterial color="#2C323D" roughness={0.38} metalness={0.55} transparent opacity={opacity} depthWrite={opacity > 0.9} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[capGeo, undefined, positions.length]}>
        <meshStandardMaterial color="#9AA2B1" roughness={0.3} metalness={0.9} transparent opacity={opacity} depthWrite={opacity > 0.9} />
      </instancedMesh>
    </group>
  );
};

const CoolantLoop: React.FC<{f: number; st: SceneState; moduleIndex: number}> = ({f, st, moduleIndex}) => {
  const {tube, halo} = useMemo(() => {
    const s = serpentine();
    return {
      tube: new THREE.TubeGeometry(s.curve, 1100, 0.016, 8, false),
      halo: new THREE.TubeGeometry(s.curve, 1100, 0.032, 8, false),
    };
  }, []);
  const glow = st.coolantGlow;
  const arrows = 16;
  const speed = 0.9 / 30 / serpentine().length;
  return (
    <group>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.84, 0.02, 2.2]} />
        <Metal color="#20242D" />
      </mesh>
      <WireBox size={[0.84, 0.02, 2.2]} position={[0, 0.03, 0]} opacity={0.7} />
      <mesh geometry={tube}>
        <meshStandardMaterial color="#2A140C" emissive={COLORS.orange} emissiveIntensity={0.12 + glow * 1.5} toneMapped={false} roughness={0.5} />
      </mesh>
      {glow > 0.01 && (
        <mesh geometry={halo}>
          <meshBasicMaterial color={COLORS.orange} transparent opacity={0.16 * glow} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <Bar a={V(-0.46, 0.052, -1.17)} b={V(0.46, 0.052, -1.17)} w={0.032} h={0.032} color={COLORS.orange} base={0.12} glow={glow * 0.8} />
      <Bar a={V(-0.46, 0.052, -1.23)} b={V(0.46, 0.052, -1.23)} w={0.032} h={0.032} color={COLORS.orange} base={0.12} glow={glow * 0.55} />
      {moduleIndex === 0 && (
        <>
          <Bar a={V(-0.85, 0.052, -1.17)} b={V(-0.46, 0.052, -1.17)} w={0.04} h={0.04} color={COLORS.orange} base={0.2} glow={glow * 0.8} />
          <Bar a={V(-0.85, 0.052, -1.23)} b={V(-0.46, 0.052, -1.23)} w={0.04} h={0.04} color={COLORS.orange} base={0.2} glow={glow * 0.55} />
        </>
      )}
      {st.arrows > 0.01 &&
        Array.from({length: arrows}, (_, k) => {
          const u = (k / arrows + f * speed + moduleIndex * 0.031) % 1;
          const {p, t} = serpAt(u);
          const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, t);
          return (
            <group key={k} position={[p.x, p.y + 0.03, p.z]} quaternion={q}>
              <mesh>
                <coneGeometry args={[0.024, 0.07, 12]} />
                <meshBasicMaterial color="#FFB08F" transparent opacity={st.arrows} toneMapped={false} />
              </mesh>
              <mesh position={[0, -0.07, 0]}>
                <cylinderGeometry args={[0.004, 0.012, 0.09, 8]} />
                <meshBasicMaterial color={COLORS.orange} transparent opacity={0.7 * st.arrows} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
    </group>
  );
};

const BusStrips: React.FC<{st: SceneState; lit: number; opacity: number}> = ({st, lit, opacity}) => {
  const glow = clamp01(st.busbar * 0.35 + lit);
  return (
    <group>
      {Array.from({length: COLS}, (_, c) => {
        const x = (c - (COLS - 1) / 2) * PITCH;
        return (
          <Bar key={c} a={V(x, 0.419, -1.0)} b={V(x, 0.419, 1.0)} w={0.07} h={0.008} color={COLORS.cyan} base={0.01} glow={glow * 0.6} opacity={opacity} body="#2A313B" />
        );
      })}
      <Bar a={V(-0.43, 0.44, -1.07)} b={V(-0.37, 0.44, -1.07)} w={0.06} h={0.04} color={COLORS.cyan} base={0.05} glow={glow} body="#3A4250" />
      <Bar a={V(0.37, 0.44, -1.07)} b={V(0.43, 0.44, -1.07)} w={0.06} h={0.04} color={COLORS.cyan} base={0.05} glow={glow} body="#3A4250" />
      <Bar a={V(-0.4, 0.44, -1.07)} b={V(-0.4, 0.425, -1.0)} w={0.03} h={0.01} color={COLORS.cyan} base={0.03} glow={glow * 0.6} body="#3A4250" />
      <Bar a={V(0.4, 0.44, -1.07)} b={V(0.4, 0.425, -1.0)} w={0.03} h={0.01} color={COLORS.cyan} base={0.03} glow={glow * 0.6} body="#3A4250" />
    </group>
  );
};

const BmsLayer: React.FC<{f: number; level: number}> = ({f, level}) => (
  <group>
    <mesh position={[0, 0.447, 1.1]}>
      <boxGeometry args={[0.62, 0.018, 0.11]} />
      <meshStandardMaterial color="#0E1A0A" emissive={COLORS.green} emissiveIntensity={0.08 + level * 0.25} roughness={0.6} toneMapped={false} />
    </mesh>
    <WireBox size={[0.62, 0.018, 0.11]} position={[0, 0.447, 1.1]} color={COLORS.green} opacity={0.35 + 0.65 * level} />
    {Array.from({length: COLS - 1}, (_, c) => {
      const x = (c - (COLS - 2) / 2) * PITCH;
      const pulses = level > 0.05 ? [0, 0.5] : [];
      return (
        <group key={c}>
          <Bar a={V(x, 0.436, -0.96)} b={V(x, 0.436, 1.05)} w={0.006} h={0.004} color={COLORS.green} base={0.08} glow={level * 0.45} />
          {pulses.map((o) => {
            const u = (o + f * 0.016 + c * 0.137) % 1;
            return <Pulse key={o} p={V(x, 0.44, -0.96 + u * 2.01)} color={COLORS.green} size={0.007} opacity={level} />;
          })}
        </group>
      );
    })}
  </group>
);

const HeroCell: React.FC<{f: number; st: SceneState}> = ({f, st}) => {
  const casing = casingAt(f);
  const y = CELL_Y + st.heroLift;
  const sense = st.heroSense;
  const capY = CELL_H / 2 + st.capLift;
  const ho = st.heroLift > 0.02 ? 1 : st.ghost;
  const dw = ho > 0.9;
  return (
    <group position={[HERO_LOCAL[0], y, HERO_LOCAL[1]]}>
      <mesh>
        <cylinderGeometry args={[casing.r, casing.r, CELL_H, 48, 1, true, casing.thetaStart, casing.thetaLength]} />
        <meshStandardMaterial color="#3A414E" roughness={0.3} metalness={0.75} side={THREE.DoubleSide} transparent opacity={ho} depthWrite={dw} />
      </mesh>
      <mesh position={[0, capY + 0.005, 0]}>
        <cylinderGeometry args={[CELL_R * 0.98, CELL_R * 0.98, 0.01, 40]} />
        <meshStandardMaterial color="#B6BDCA" roughness={0.25} metalness={0.95} transparent opacity={ho} depthWrite={dw} />
      </mesh>
      <mesh position={[0, capY + 0.013, 0]}>
        <cylinderGeometry args={[CELL_R * 0.4, CELL_R * 0.4, 0.008, 32]} />
        <meshStandardMaterial color="#D3D8E0" roughness={0.2} metalness={1} transparent opacity={ho} depthWrite={dw} />
      </mesh>
      <mesh position={[0, -CELL_H / 2 - 0.004, 0]}>
        <cylinderGeometry args={[CELL_R * 0.98, CELL_R * 0.98, 0.008, 40]} />
        <meshStandardMaterial color="#8E96A4" roughness={0.3} metalness={0.9} transparent opacity={ho} depthWrite={dw} />
      </mesh>
      {st.jellyVisible && (
        <>
          <mesh>
            <cylinderGeometry args={[0.0055, 0.0055, CELL_H * 0.96, 16]} />
            <meshStandardMaterial color="#C9CED6" metalness={0.9} roughness={0.25} />
          </mesh>
          {LAYERS.map((L) => {
            const l = layerAt(f, L.j);
            const h = L.type === 'separator' ? CELL_H * 0.95 : CELL_H * 0.91;
            return (
              <mesh key={L.j}>
                <cylinderGeometry args={[l.r, l.r, h, 64, 1, true, l.thetaStart, l.thetaLength]} />
                {L.type === 'cathode' && <meshStandardMaterial color="#8E9AB2" metalness={0.55} roughness={0.35} side={THREE.DoubleSide} />}
                {L.type === 'anode' && <meshStandardMaterial color="#A8663D" metalness={0.6} roughness={0.38} side={THREE.DoubleSide} />}
                {L.type === 'separator' && (
                  <meshStandardMaterial color="#E9EDF3" metalness={0} roughness={0.85} transparent opacity={0.72} side={THREE.DoubleSide} />
                )}
              </mesh>
            );
          })}
        </>
      )}
      {sense > 0.01 &&
        (() => {
          const route = [
            V(-CELL_R * 0.6, capY + 0.01, 0),
            V(-CELL_R * 0.6, capY + 0.06, 0),
            V(-0.14, capY + 0.06, -0.06),
            V(-0.14, 0.452 - y, -0.06),
            V(-0.14, 0.452 - y, 1.05 - HERO_LOCAL[1]),
          ];
          return (
            <>
              {route.slice(1).map((p, k) => (
                <Bar key={k} a={route[k]} b={p} w={0.003} h={0.003} color={COLORS.green} base={0.3} glow={sense} />
              ))}
              {[0, 0.25, 0.5, 0.75].map((o) => {
                const u = (o + f * 0.012) % 1;
                const k = Math.min(route.length - 2, Math.floor(u * (route.length - 1)));
                const t = u * (route.length - 1) - k;
                return <Pulse key={o} p={route[k].clone().lerp(route[k + 1], t)} color={COLORS.green} size={0.0035} opacity={sense} />;
              })}
            </>
          );
        })()}
      <pointLight position={[0.25, 0.2, 0.3]} intensity={1.4 * st.macroLight} distance={1.5} decay={2} color="#E6F0FF" />
      <pointLight position={[-0.2, 0.05, 0.25]} intensity={0.5 * st.macroLight} distance={1.2} decay={2} color={COLORS.cyan} />
    </group>
  );
};

const Module: React.FC<{i: number; f: number; st: SceneState; lit: number}> = ({i, f, st, lit}) => {
  const e = st.explode;
  const isHero = i === HERO_MODULE;
  const opacity = isHero ? st.ghost : 1;
  return (
    <group position={[modX(i, e), modY(e), 0]}>
      <group position={[0, plateLayerY(e), 0]}>
        <CoolantLoop f={f} st={st} moduleIndex={i} />
      </group>
      <CellArray moduleIndex={i} opacity={opacity} />
      {isHero && <HeroCell f={f} st={st} />}
      <WireBox size={[0.86, CELL_H + 0.04, 2.12]} position={[0, CELL_Y, 0]} opacity={0.55} />
      <group position={[0, busLayerY(e), 0]}>
        <BusStrips st={st} lit={lit} opacity={isHero ? Math.max(0.25, opacity) : 1} />
      </group>
      <group position={[0, bmsLayerY(e), 0]}>
        <BmsLayer f={f} level={st.bms(i)} />
      </group>
    </group>
  );
};

// ---------- HV junction + chain ----------
const litAt = (chain: Chain, s: number, p: number) => (p <= 0 ? 0 : clamp01((p - frontDistance(chain, s)) / 0.06 + 1) * Math.min(1, p * 25));

const JunctionBox: React.FC<{st: SceneState}> = ({st}) => {
  const b = boxPos(st.explode);
  const c = st.contactor;
  return (
    <group position={b}>
      <mesh>
        <boxGeometry args={[0.18, 0.34, 0.9]} />
        <Metal color="#1A1E26" opacity={0.35} />
      </mesh>
      <WireBox size={[0.18, 0.34, 0.9]} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, 0.06, s * 0.22]}>
            <boxGeometry args={[0.1, 0.08, 0.12]} />
            <meshStandardMaterial color="#10232A" emissive={COLORS.cyan} emissiveIntensity={0.15 + 1.6 * c} toneMapped={false} />
          </mesh>
          <WireBox size={[0.1, 0.08, 0.12]} position={[0, 0.06, s * 0.22]} color={COLORS.cyan} opacity={0.4 + 0.6 * c} />
          <mesh position={[0.225, 0, s * 0.22]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.27, 24]} />
            <meshStandardMaterial color="#B4BCC9" metalness={0.95} roughness={0.25} emissive={COLORS.cyan} emissiveIntensity={c * 1.2} toneMapped={false} />
          </mesh>
          <mesh position={[0.33, 0, s * 0.22]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 24]} />
            <meshStandardMaterial color="#20242D" metalness={0.6} roughness={0.5} />
          </mesh>
          {c > 0.01 && (
            <mesh position={[0.36, 0, s * 0.22]}>
              <sphereGeometry args={[0.09, 16, 12]} />
              <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.28 * c} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
      <mesh position={[0, 0.185, 0.3]}>
        <boxGeometry args={[0.14, 0.015, 0.2]} />
        <meshStandardMaterial color="#0E1A0A" emissive={COLORS.green} emissiveIntensity={0.1 + st.bms(4) * 0.5} toneMapped={false} />
      </mesh>
      <WireBox size={[0.14, 0.015, 0.2]} position={[0, 0.185, 0.3]} color={COLORS.green} opacity={0.4 + 0.6 * st.bms(4)} />
    </group>
  );
};

const HvChain: React.FC<{f: number; st: SceneState; chain: Chain}> = ({f, st, chain}) => {
  const p = st.converge;
  const pts = chain.points;
  return (
    <group>
      {pts.map((pt, k) => {
        if (!pt.visibleFromPrev) return null;
        const sMid = (pt.s + pts[k - 1].s) / 2;
        const glow = clamp01(st.busbar * 0.3 + litAt(chain, sMid, p) * 0.85 + st.contactor * 0.15);
        return <Bar key={k} a={pts[k - 1].p} b={pt.p} w={0.04} h={0.014} color={COLORS.cyan} base={0.03} glow={glow} body="#3A4250" />;
      })}
      {p > 0.01 &&
        Array.from({length: 14}, (_, j) =>
          [-1, 1].map((side) => {
            const u = (j / 14 + f * 0.011) % 1;
            if (u > p) return null;
            const s = side < 0 ? chain.center * (1 - u) : chain.center + u * (1 - chain.center);
            return <Pulse key={`${j}${side}`} p={chainPointAt(chain, s)} color={COLORS.cyan} size={0.016} opacity={Math.min(1, (p - u) * 12)} />;
          }),
        )}
    </group>
  );
};

const BmsDaisy: React.FC<{f: number; st: SceneState}> = ({f, st}) => {
  const e = st.explode;
  const y = modY(e) + bmsLayerY(e) + 0.462;
  const lvl = st.bms(3);
  const nodes = MODULE_X.map((_, i) => V(modX(i, e), y, 1.1));
  const m = bmsMasterPos(e);
  const route = [...nodes, V(m.x, y, 1.1), V(m.x, m.y + 0.01, 1.1), V(m.x, m.y + 0.01, m.z)];
  return (
    <group>
      {route.slice(1).map((pt, k) => (
        <Bar key={k} a={route[k]} b={pt} w={0.006} h={0.006} color={COLORS.green} base={0.1} glow={lvl * 0.8} />
      ))}
      {lvl > 0.05 &&
        [0, 0.25, 0.5, 0.75].map((o) => {
          const u = (o + f * 0.006) % 1;
          const k = Math.min(route.length - 2, Math.floor(u * (route.length - 1)));
          const t = u * (route.length - 1) - k;
          return <Pulse key={o} p={route[k].clone().lerp(route[k + 1], t)} color={COLORS.green} size={0.01} opacity={lvl} />;
        })}
    </group>
  );
};

export const Scene: React.FC<{f: number; cam?: CamState}> = ({f, cam}) => {
  const st = sceneAt(f);
  const chain = chainAt(st.explode);
  const moduleLit = chain.moduleS.map((s) => litAt(chain, s, st.converge));
  return (
    <>
      <color attach="background" args={[COLORS.base]} />
      <CameraRig f={f} cam={cam} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#A9BCD8', '#0A0C10', 0.7]} />
      <directionalLight position={[6, 10, 5]} intensity={2.2} />
      <directionalLight position={[-6, 4, -6]} intensity={0.8} color="#7FA8FF" />
      <directionalLight position={[2, -3, 6]} intensity={0.35} color="#FFD7C2" />
      <gridHelper args={[44, 88, '#2B303B', '#191C23']} position={[0, -1.35, 0]} />
      <FrameTray st={st} />
      <Shield st={st} />
      {MODULE_X.map((_, i) => (
        <Module key={i} i={i} f={f} st={st} lit={moduleLit[i]} />
      ))}
      <JunctionBox st={st} />
      <HvChain f={f} st={st} chain={chain} />
      <BmsDaisy f={f} st={st} />
    </>
  );
};
