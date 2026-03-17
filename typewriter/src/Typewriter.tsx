import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const FULL_TEXT = 'obey';
const CHAR_FRAMES = 8; // frames per character
const CURSOR_BLINK_FRAMES = 16;

const Cursor: React.FC<{frame: number}> = ({frame}) => {
  const opacity = interpolate(
    frame % CURSOR_BLINK_FRAMES,
    [0, CURSOR_BLINK_FRAMES / 2, CURSOR_BLINK_FRAMES],
    [1, 0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return <span style={{opacity}}>▌</span>;
};

export const Typewriter: React.FC = () => {
  const frame = useCurrentFrame();

  const typedChars = Math.min(
    FULL_TEXT.length,
    Math.floor(frame / CHAR_FRAMES),
  );
  const typedText = FULL_TEXT.slice(0, typedChars);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          color: '#e8e8e8',
          fontSize: 120,
          fontWeight: 700,
          fontFamily: 'monospace',
          letterSpacing: '0.15em',
          textTransform: 'lowercase',
        }}
      >
        <span>{typedText}</span>
        <Cursor frame={frame} />
      </div>
    </AbsoluteFill>
  );
};
