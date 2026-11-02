import {registerRoot} from 'remotion';
// Loads the brand fonts before any frame is captured. Imported for side effects.
import './fonts';
import {RemotionRoot} from './Root';

registerRoot(RemotionRoot);
