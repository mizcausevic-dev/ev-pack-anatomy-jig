import {Composition, Still} from 'remotion';
import {EVPackJig} from './EVPackJig';
import {HeroImage} from './HeroImage';
import {DURATION, FPS, HEIGHT, WIDTH} from './timeline';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="EVPackJig"
      component={EVPackJig}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Still id="HeroImage" component={HeroImage} width={2400} height={1260} />
  </>
);
