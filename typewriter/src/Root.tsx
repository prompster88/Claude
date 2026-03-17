import {Composition} from 'remotion';
import {Typewriter} from './Typewriter';

// "obey" = 4 chars × 8 frames/char + 40 frames hold = 72 frames
const CHAR_FRAMES = 8;
const HOLD_FRAMES = 40;
const DURATION = 'obey'.length * CHAR_FRAMES + HOLD_FRAMES;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Typewriter"
      component={Typewriter}
      durationInFrames={DURATION}
      fps={30}
      width={1280}
      height={720}
    />
  );
};
