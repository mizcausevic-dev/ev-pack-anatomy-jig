import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Hud} from './Hud';
import {Scene} from './Scene';
import {COLORS} from './timeline';

export const EVPackJig: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.base}}>
      <ThreeCanvas width={width} height={height} gl={{antialias: true}} camera={{fov: 30, near: 0.01, far: 200, position: [8, 4, 8]}}>
        <Scene f={frame} />
      </ThreeCanvas>
      <Hud f={frame} />
    </AbsoluteFill>
  );
};
