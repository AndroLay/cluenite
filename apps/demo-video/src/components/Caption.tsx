import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLOR, FONT, reveal} from '../theme';

type CaptionProps = {
  text: string;
  // Optional small label above the text, e.g. "Voice-over" or "Chat command".
  kicker?: string;
  // Render as a chat command (monospace), for example "!look CAM".
  command?: boolean;
  // Frame offset from the start of the enclosing sequence.
  delay?: number;
};

// Lower-third caption. Captions are text only: this project has no audio,
// so the caption carries the voice-over line as readable on-screen text.
export const Caption: React.FC<CaptionProps> = ({text, kicker, command = false, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = reveal(frame, fps, delay);
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const translateY = interpolate(enter, [0, 1], [18, 0]);

  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 92}}>
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          maxWidth: 1480,
          padding: '20px 36px',
          borderRadius: 6,
          backgroundColor: 'rgba(18,12,8,0.82)',
          border: `1px solid ${COLOR.walnut}`,
          textAlign: 'center',
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: FONT.text,
              fontWeight: 600,
              fontSize: 20,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: COLOR.amber,
              marginBottom: 8,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: command ? FONT.mono : FONT.text,
            fontWeight: command ? 400 : 500,
            fontSize: command ? 36 : 38,
            lineHeight: 1.3,
            color: COLOR.parchment,
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
