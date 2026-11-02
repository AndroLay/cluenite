import React from 'react';
import {Composition,registerRoot} from 'remotion';
import '../fonts';
import {Trailer150} from './Trailer150';

const Root:React.FC=()=> <>
  <Composition id="ClueniteTrailer150" component={Trailer150} width={1920} height={1080} fps={30} durationInFrames={4500}/>
</>;
registerRoot(Root);
