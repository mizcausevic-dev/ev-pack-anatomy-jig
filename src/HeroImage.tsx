import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as loadGrotesk} from '@remotion/google-fonts/SpaceGrotesk';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {Scene} from './Scene';
import {COLORS, type CamState} from './timeline';

const {fontFamily: MONO} = loadMono('normal', {weights: ['400', '600'], subsets: ['latin']});
const {fontFamily: GROTESK} = loadGrotesk('normal', {weights: ['500', '700'], subsets: ['latin']});

const HERO_FRAME = 1008;
const DEG = Math.PI / 180;
const az = 45 * DEG;
const el = 35.264 * DEG;
const r = 16.5;
const target = new THREE.Vector3(-1.05, 1.0, 1.45);
const HERO_CAM: CamState = {
  target,
  position: target.clone().add(new THREE.Vector3(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az))),
  fov: 24,
  near: 0.3,
};

const Chip: React.FC<{c: string; l: string}> = ({c, l}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, color: COLORS.text}}>
    <span style={{width: 30, height: 4, background: c, boxShadow: `0 0 12px ${c}`}} />
    {l}
  </div>
);

export const HeroImage: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.base}}>
      <ThreeCanvas width={width} height={height} gl={{antialias: true}} camera={{fov: 24, near: 0.3, far: 200, position: [8, 4, 8]}}>
        <Scene f={HERO_FRAME} cam={HERO_CAM} />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, ${COLORS.base} 0%, ${COLORS.base}EE 30%, ${COLORS.base}00 58%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(58,63,77,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(58,63,77,0.12) 1px, transparent 1px)',
          backgroundSize: '70px 70px',
        }}
      />
      <div style={{position: 'absolute', left: 110, top: 150, width: 880, fontFamily: MONO}}>
        <div style={{color: COLORS.cyan, fontSize: 22, letterSpacing: 7}}>REMOTION × REACT THREE FIBER</div>
        <div style={{fontFamily: GROTESK, fontWeight: 700, color: '#F2F4F8', fontSize: 98, lineHeight: 1.02, marginTop: 34, letterSpacing: -2}}>
          Anatomy of an EV battery pack under fast charge
        </div>
        <div style={{color: COLORS.text, fontSize: 28, lineHeight: 1.5, marginTop: 34, maxWidth: 780}}>
          34 seconds · 1,020 frames · every pixel a pure function of the frame number
        </div>
        <div style={{display: 'flex', gap: 40, marginTop: 64, fontSize: 19, letterSpacing: 3}}>
          <Chip c={COLORS.cyan} l="HV BUSBAR" />
          <Chip c={COLORS.orange} l="COOLANT" />
          <Chip c={COLORS.green} l="BMS" />
        </div>
      </div>
      <div style={{position: 'absolute', left: 110, bottom: 80, fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: COLORS.dim}}>
        KINETIC GAIN · PROCEDURAL ENGINEERING MOTION
      </div>
    </AbsoluteFill>
  );
};
