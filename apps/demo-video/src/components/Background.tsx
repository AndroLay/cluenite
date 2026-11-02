import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLOR} from '../theme';

// Film-grain tile. The turbulence is generated inline so no image asset is needed.
const GRAIN_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='true'/>" +
  "<feColorMatrix values='0 0 0 0 1  0 0 0 0 0.92  0 0 0 0 0.8  0 0 0 0.07 0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(%23n)'/></svg>";

type BackgroundProps = {
  // Strength of the drifting amber light, 0 to 1.
  glow?: number;
};

// Slow, looping light drift and per-frame grain shift give the frame life
// without competing with the foreground content.
export const Background: React.FC<BackgroundProps> = ({glow = 0.18}) => {
  const frame = useCurrentFrame();
  const lightX = 50 + Math.sin(frame / 110) * 9;
  const lightY = 34 + Math.cos(frame / 150) * 6;

  return (
    <AbsoluteFill style={{backgroundColor: COLOR.ink, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 60% at ${lightX}% ${lightY}%, rgba(217,164,65,${glow}) 0%, rgba(217,164,65,0) 70%), linear-gradient(180deg, ${COLOR.umber} 0%, ${COLOR.ink} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 85% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url("${GRAIN_SVG}")`,
          backgroundPosition: `${(frame * 37) % 320}px ${(frame * 53) % 320}px`,
          opacity: 0.55,
          mixBlendMode: 'overlay',
        }}
      />
    </AbsoluteFill>
  );
};
