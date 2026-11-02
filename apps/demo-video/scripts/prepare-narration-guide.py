"""Render an editable narration guide locally; this is a synthetic draft voice."""
from pathlib import Path
import inspect
import json
import os
import shutil
import sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

root = Path(__file__).resolve().parent.parent
cache = Path.home() / '.cache' / 'hyperframes' / 'tts'
script = json.loads((root / 'src/submission/script.json').read_text(encoding='utf-8'))
destination = root / 'public/submission/narration'
destination.mkdir(parents=True, exist_ok=True)
options = {}
if os.name == 'nt' and 'espeak_config' in inspect.signature(Kokoro.__init__).parameters:
    import espeakng_loader
    from kokoro_onnx.config import EspeakConfig
    source = Path(espeakng_loader.get_data_path())
    if len(str(source)) > 200:
        target = root / 'out' / 'espeak-data'
        if not target.exists():
            shutil.copytree(source, target)
        options['espeak_config'] = EspeakConfig(data_path=str(target))
model = Kokoro(str(cache / 'models/kokoro-v1.0.onnx'), str(cache / 'voices/voices-v1.0.bin'), **options)
alignment_path = root / 'src/submission/narration-guide.generated.json'
alignment = json.loads(alignment_path.read_text(encoding='utf-8')) if alignment_path.exists() else []
selected = sys.argv[1].split(',') if len(sys.argv) > 1 else None
for segment in script['segments']:
    if selected and segment['id'] not in selected:
        continue
    variants = [('default', segment.get('fallbackLines', segment['lines']))]
    if 'fallbackLines' in segment:
        variants.append(('coop', segment['lines']))
    for variant, lines in variants:
        cues = []
        parts = []
        cursor = .55
        for line in lines:
            samples, sr = model.create(line.replace('Cluenite', 'Clue Night'), voice='bm_george', speed=1.02, lang='en-gb')
            duration = len(samples) / sr
            cues.append({'at': round(cursor, 3), 'duration': round(duration, 3), 'text': line})
            parts.append(samples)
            cursor += duration + .26
        available = segment['end'] - segment['start']
        if cursor > available - .25:
            raise RuntimeError(f"Narration exceeds {segment['id']}: {cursor:.2f}s / {available}s; shorten the script before exporting.")
        output = np.zeros(round(available * sr), dtype=np.float32)
        for cue, samples in zip(cues, parts):
            offset = round(cue['at'] * sr)
            output[offset:offset+len(samples)] = samples
        rms = np.sqrt(np.mean(output[output != 0] ** 2))
        gain = min(.16 / max(rms, .0001), .88 / max(float(np.max(np.abs(output))), .0001))
        output *= gain
        name = segment['id'] + ('' if variant == 'default' else '-coop')
        sf.write(destination / (name + '.wav'), output, sr, subtype='PCM_16')
        alignment = [a for a in alignment if (a['id'], a['variant']) != (segment['id'], variant)]
        alignment.append({'id':segment['id'], 'variant':variant, 'start':segment['start'], 'end':segment['end'], 'file':'submission/narration/'+name+'.wav', 'voice':'Kokoro bm_george, synthetic guide', 'cues':cues})
        alignment_path.write_text(json.dumps(alignment, indent=2)+'\n', encoding='utf-8')
        print(json.dumps({'segment':name, 'spokenEnd':round(cursor,2), 'budget':available}), flush=True)
alignment_path.write_text(json.dumps(alignment, indent=2)+'\n', encoding='utf-8')
