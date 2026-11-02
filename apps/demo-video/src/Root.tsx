import {Composition} from 'remotion';
import {Main} from './Main';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './timeline';
import {Submission} from './submission/Submission';
import {SubmissionBuild,SubmissionContentReview,SubmissionOpening} from './submission/ContentReview';

// Rejected commercial and 3D studies are outside the active render graph.
export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="ClueniteSubmission175" component={Submission} durationInFrames={5250} fps={30} width={1920} height={1080}/>
  <Composition id="ClueniteContentReview" component={SubmissionContentReview} durationInFrames={1050} fps={30} width={1920} height={1080}/>
  <Composition id="ClueniteOpening" component={SubmissionOpening} durationInFrames={360} fps={30} width={1920} height={1080}/>
  <Composition id="ClueniteBuildStory" component={SubmissionBuild} durationInFrames={690} fps={30} width={1920} height={1080}/>
  <Composition
    id="ClueniteDemo"
    component={Main}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
  </>
);
