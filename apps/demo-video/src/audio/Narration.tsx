import {Audio, Sequence, staticFile} from 'remotion';
import {FPS, segmentRange, type SegmentId} from '../timeline';
import {NARRATION} from './narration.generated';

// Places each generated Kokoro line at its offset inside its segment. The lines and
// durations come from scripts/audio.mjs (run `npm run audio`); do not hand-edit them.
export const Narration: React.FC = () => (
  <>
    {NARRATION.map((line) => {
      const segment = segmentRange(line.segment as SegmentId);
      return (
        <Sequence
          key={line.id}
          from={segment.from + Math.round(line.atSec * FPS)}
          durationInFrames={Math.ceil(line.durationSec * FPS)}
          name={`VO ${line.id}`}
        >
          <Audio src={staticFile(line.file)} />
        </Sequence>
      );
    })}
  </>
);
