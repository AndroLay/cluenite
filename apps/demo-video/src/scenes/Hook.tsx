import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {Caption} from '../components/Caption';
import {FootageSlot} from '../components/FootageSlot';
import {footageSrc} from '../footage';
import {COLOR, FONT, reveal} from '../theme';

// S1 · 0:00–0:12 · Hook. Streamer example.
// Until the owner's recording exists, this illustrates the streamer's view.
// It is labeled as illustration and is not Twitch proof.
export const Hook: React.FC = () => {
  const hasRecording = footageSrc('S1-stream') !== null;

  return (
    <AbsoluteFill>
      <Background glow={0.22} />
      {hasRecording ? <FootageSlot id="S1-stream" /> : <StreamerIllustration />}
      <div
        style={{
          position: 'absolute',
          top: 84,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT.text,
          fontWeight: 600,
          fontSize: 26,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: COLOR.amber,
        }}
      >
        Cluenite · Twitch-native mystery overlay
      </div>
      <Caption text="One minute of downtime becomes a shared mystery." />
    </AbsoluteFill>
  );
};

const pad = (value: number): string => String(value).padStart(2, '0');

const StreamerIllustration: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const streamIn = reveal(frame, fps, 30);
  const overlayIn = reveal(frame, fps, 150);
  const chatIn = interpolate(frame, [190, 210], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const evidenceIn = interpolate(frame, [228, 252], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Downtime counter runs from 00:00 to 00:59 while the "Be right back" slate is up.
  const seconds = Math.min(
    59,
    Math.floor(interpolate(frame, [60, 240], [0, 59], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})),
  );

  return (
    <AbsoluteFill>
      {/* Streamer's game capture: a 16:9 box with a downtime slate. */}
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 230,
          width: 1000,
          height: 562,
          borderRadius: 12,
          border: `1px solid ${COLOR.walnut}`,
          background: `linear-gradient(160deg, #1d140e 0%, ${COLOR.ink} 100%)`,
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          opacity: streamIn,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 24,
            top: 18,
            fontFamily: FONT.text,
            fontSize: 18,
            letterSpacing: 2,
            color: COLOR.mute,
          }}
        >
          STREAMER · GAME CAPTURE
        </div>
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{fontFamily: FONT.display, fontSize: 84, color: COLOR.parchment}}>Be right back</div>
          <div style={{marginTop: 22, fontFamily: FONT.mono, fontSize: 40, color: COLOR.amber}}>
            DOWNTIME 00:{pad(seconds)}
          </div>
        </div>
      </div>

      {/* Quick Case overlay, shown as the Twitch chat drives it. */}
      <div
        style={{
          position: 'absolute',
          left: 1230,
          top: 300,
          width: 540,
          padding: '34px 36px',
          borderRadius: 8,
          backgroundColor: 'rgba(18,12,8,0.9)',
          border: `1px solid ${COLOR.walnut}`,
          opacity: overlayIn,
          transform: `translateX(${interpolate(overlayIn, [0, 1], [120, 0])}px)`,
          fontFamily: FONT.text,
        }}
      >
        <div style={{fontSize: 18, letterSpacing: 4, color: COLOR.amber, fontWeight: 600}}>QUICK CASE</div>
        <div style={{marginTop: 10, fontFamily: FONT.display, fontSize: 40, color: COLOR.parchment, fontWeight: 600}}>
          Downtime became a case
        </div>
        <div
          style={{
            marginTop: 22,
            opacity: chatIn,
            fontFamily: FONT.mono,
            fontSize: 26,
            color: COLOR.parchment,
          }}
        >
          <span style={{color: COLOR.mute}}>viewer › </span>!look CAM
        </div>
        <div
          style={{
            marginTop: 20,
            padding: '14px 18px',
            borderLeft: `4px solid ${COLOR.amber}`,
            backgroundColor: 'rgba(217,164,65,0.08)',
            opacity: evidenceIn,
          }}
        >
          <div style={{fontSize: 28, color: COLOR.parchment, fontWeight: 500}}>Camera still, 21:10</div>
          <div style={{marginTop: 6, fontFamily: FONT.mono, fontSize: 20, color: COLOR.mute}}>
            Unlocked · CAM_R07
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 806,
          fontFamily: FONT.text,
          fontSize: 18,
          letterSpacing: 2,
          color: COLOR.amber,
        }}
      >
        ILLUSTRATION · NOT A TWITCH RECORDING · REAL CAPTURE PENDING
      </div>
    </AbsoluteFill>
  );
};
