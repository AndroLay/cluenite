import React from 'react';
import {Composition,registerRoot} from 'remotion';
import '../fonts';
import {OpeningStudy} from './OpeningStudy';

const Root:React.FC=()=> <Composition id="ClueniteOpeningStudy" component={OpeningStudy}
  width={1920} height={1080} fps={30} durationInFrames={900}/>;
registerRoot(Root);
