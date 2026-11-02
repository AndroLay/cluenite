import {AbsoluteFill, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FOOTAGE, footageSrc, type FootageId} from '../footage';
import {ILLUSTRATIONS} from '../illustrations/Illustrations';
import {COLOR, FONT, reveal} from '../theme';

type FootageSlotProps = {
  id: FootageId;
  // Shown only while no recording is linked. Overrides the mapped illustration.
  // Any illustration must carry the "ILLUSTRATION · NOT A TWITCH RECORDING" label.
  fallback?: React.ReactNode;
};

// Renders the real recording once `file` is set in footage.ts. Until then the slot
// shows its labeled illustration from illustrations/Illustrations.tsx, or a
// placeholder card if none is mapped, so no draft frame can pass as proof.
// Recordings are muted: the video carries no narration or licensed music.
export const FootageSlot: React.FC<FootageSlotProps> = ({id, fallback}) => {
  const src = footageSrc(id);
  if (src !== null) {
    return (
      <AbsoluteFill>
        <OffthreadVideo src={src} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
    );
  }
  const Illustration = ILLUSTRATIONS[id];
  return <>{fallback ?? (Illustration ? <Illustration /> : <PendingCard id={id} />)}</>;
};

const PendingCard: React.FC<{id: FootageId}> = ({id}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = reveal(frame, fps);
  // A thin light bar sweeps down the card so the placeholder reads as live, not frozen.
  const sweepY = interpolate(frame % 120, [0, 120], [-10, 110]);

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: enter}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, transparent ${sweepY}%, rgba(217,164,65,0.07) ${sweepY + 1}%, transparent ${sweepY + 3}%)`,
        }}
      />
      <div
        style={{
          width: '78%',
          padding: '56px 64px',
          border: `2px dashed ${COLOR.amber}`,
          borderRadius: 8,
          backgroundColor: 'rgba(18,12,8,0.7)',
          textAlign: 'center',
          fontFamily: FONT.text,
        }}
      >
        <div style={{fontWeight: 700, fontSize: 26, letterSpacing: 5, color: COLOR.amber}}>
          REAL FOOTAGE PENDING
        </div>
        <div style={{marginTop: 18, fontSize: 22, color: COLOR.mute, fontFamily: FONT.mono}}>{id}</div>
        <div style={{marginTop: 22, fontSize: 28, lineHeight: 1.4, color: COLOR.parchment}}>
          {FOOTAGE[id].brief}
        </div>
        <div style={{marginTop: 26, fontSize: 20, color: COLOR.mute}}>
          Record the screen, then set this slot's file in src/footage.ts.
        </div>
      </div>
    </AbsoluteFill>
  );
};
