import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';

// Loads the bundled, OFL-licensed WOFF2 files from public/fonts/ before any
// frame is captured, so renders never fall back to a system serif or sans.
const FACES = [
  {family: 'EB Garamond', weight: '400', file: 'fonts/eb-garamond-latin-400-normal.woff2'},
  {family: 'EB Garamond', weight: '600', file: 'fonts/eb-garamond-latin-600-normal.woff2'},
  {family: 'Inter', weight: '400', file: 'fonts/inter-latin-400-normal.woff2'},
  {family: 'Inter', weight: '500', file: 'fonts/inter-latin-500-normal.woff2'},
  {family: 'Inter', weight: '600', file: 'fonts/inter-latin-600-normal.woff2'},
  {family: 'Inter', weight: '700', file: 'fonts/inter-latin-700-normal.woff2'},
] as const;

const handle = delayRender('Loading brand fonts');

Promise.all(
  FACES.map(async (face) => {
    const font = new FontFace(face.family, `url(${staticFile(face.file)})`, {
      weight: face.weight,
    });
    await font.load();
    // The bundled TypeScript DOM lib omits FontFaceSet.add, which browsers implement.
    (document.fonts as unknown as {add(font: FontFace): void}).add(font);
  }),
)
  .then(() => continueRender(handle))
  .catch((error: unknown) => cancelRender(error as Error));
