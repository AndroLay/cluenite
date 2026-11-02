"""Generate local synthetic narration, timed captions and a voice-first final mix.

Only the original script is synthesized. No gameplay sounds or provider messages
are presented as recordings. Existing original Cluenite score remains the bed.
"""
from pathlib import Path
import json, os, inspect, shutil, subprocess, hashlib, re
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT=Path(__file__).resolve().parent.parent
DEST=ROOT/'public/final175'; DEST.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'out/final175-audio'; OUT.mkdir(parents=True,exist_ok=True)
script=json.loads((ROOT/'src/final175/narration.json').read_text())
cache=Path.home()/'.cache/hyperframes/tts'
options={}
if os.name=='nt' and 'espeak_config' in inspect.signature(Kokoro.__init__).parameters:
    import espeakng_loader
    from kokoro_onnx.config import EspeakConfig
    source=Path(espeakng_loader.get_data_path())
    if len(str(source))>200:
        target=ROOT/'out/espeak-data'
        if not target.exists():shutil.copytree(source,target)
        options['espeak_config']=EspeakConfig(data_path=str(target))
# Bound inference threads so narration does not monopolize the capture machine.
os.environ.setdefault('OMP_NUM_THREADS','2')
model=Kokoro(str(cache/'models/kokoro-v1.0.onnx'),str(cache/'voices/voices-v1.0.bin'),**options)
sr=24000; voice=np.zeros(round(script['seconds']*sr),np.float32)
alignment=[]; captions=[]
for cue in script['cues']:
    text=cue['text'].replace('Cluenite','Clue Night').replace('Codex','Code-ex').replace('EventSub','Event Sub').replace('PostgreSQL','Postgres').replace('Socket','Socket')
    raw=OUT/(cue['id']+'.wav')
    key=hashlib.sha256((text+script['voice']+'1.08').encode()).hexdigest()
    stamp=raw.with_suffix('.key')
    if raw.exists() and stamp.exists() and stamp.read_text()==key:samples,sr=sf.read(raw,dtype='float32')
    else:
        samples,sr=model.create(text,voice=script['voice'],speed=1.08,lang='en-gb')
        # Keep natural phrasing but remove model-generated edge silence.
        loud=np.where(np.abs(samples)>.004)[0]
        if len(loud):samples=samples[max(0,loud[0]-round(.06*sr)):min(len(samples),loud[-1]+round(.14*sr))]
        sf.write(raw,samples,sr,subtype='PCM_16');stamp.write_text(key)
    duration=len(samples)/sr;budget=cue['end']-cue['start']
    if duration>budget:
        ratio=duration/budget
        if ratio>1.32:raise RuntimeError(f"Shorten {cue['id']}: {duration:.2f}s does not fit {budget:.2f}s")
        conformed=OUT/(cue['id']+'-fit.wav')
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-af',f'atempo={ratio:.8f}','-ar',str(sr),str(conformed)],check=True)
        samples,sr=sf.read(conformed,dtype='float32');samples=samples[:round(budget*sr)]
    active=np.abs(samples)>.006
    gain=min(.17/max(float(np.sqrt(np.mean(samples[active]**2))),.001),.89/max(float(np.max(np.abs(samples))),.001))
    samples*=gain;offset=round(cue['start']*sr);voice[offset:offset+len(samples)]+=samples
    spoken_end=cue['start']+len(samples)/sr
    alignment.append({**cue,'spokenEnd':round(spoken_end,3),'duration':round(len(samples)/sr,3),'atempo':round(max(1,duration/budget),4)})
    # Human-readable caption phrases with explicit JSON timing. No kinetic words.
    phrases=re.split(r'(?<=[.!?:])\s+|(?<=,)\s+',cue['text'])
    chunks=[]
    for phrase in phrases:
        if chunks and len(chunks[-1])+len(phrase)<89:chunks[-1]+=' '+phrase
        else:chunks.append(phrase)
    total=sum(len(c) for c in chunks);cursor=cue['start']
    for chunk in chunks:
        stop=cursor+(spoken_end-cue['start'])*len(chunk)/total
        captions.append({'text':chunk,'startMs':round(cursor*1000),'endMs':round(stop*1000),'timestampMs':None,'confidence':None})
        cursor=stop
    print(json.dumps({'cue':cue['id'],'spoken':round(len(samples)/sr,2),'budget':budget}),flush=True)
sf.write(DEST/'narration.wav',voice,sr,subtype='PCM_16')
(ROOT/'src/final175/captions.json').write_text(json.dumps(captions,indent=2)+'\n')
(OUT/'alignment.json').write_text(json.dumps(alignment,indent=2)+'\n')
def tc(ms):
    h,rem=divmod(round(ms),3600000);m,rem=divmod(rem,60000);s,ms=divmod(rem,1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'
(DEST/'narration.en.srt').write_text('\n\n'.join(f"{i+1}\n{tc(c['startMs'])} --> {tc(c['endMs'])}\n{c['text']}" for i,c in enumerate(captions))+'\n',encoding='utf-8')
# The existing 150s original composition contains instrumental music and Foley.
# Extend its quiet investigation section, then use sidechain ducking for speech.
bed=ROOT/'public/trailer150/score.wav'
if not bed.exists():bed=ROOT/'public/practice165/score.wav'
graph=("[1:a]asplit=2[v][key];"
       "[0:a]volume=0.30,afade=t=in:st=0:d=1.5,afade=t=out:st=171:d=4[bed];"
       "[bed][key]sidechaincompress=threshold=0.018:ratio=6:attack=35:release=420[duck];"
       "[duck][v]amix=inputs=2:normalize=0,alimiter=limit=0.90:level=false,apad,atrim=0:175[out]")
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-stream_loop','-1','-i',str(bed),'-i',str(DEST/'narration.wav'),'-filter_complex',graph,'-map','[out]','-ar','48000','-ac','2',str(DEST/'mix-premaster.wav')],check=True)
# One loudness pass supplies measurement; the second pass makes a reproducible mix.
base=['ffmpeg','-hide_banner','-nostats','-i',str(DEST/'mix-premaster.wav')]
p=subprocess.run(base+['-af','loudnorm=I=-17:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
measurement=json.loads(p.stderr[p.stderr.rfind('{'):]);(OUT/'loudness-premaster.json').write_text(json.dumps(measurement,indent=2))
f='loudnorm=I=-17:TP=-1.5:LRA=9:linear=true:'+':'.join(f'{a}={measurement[b]}' for a,b in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])
subprocess.run(base+['-y','-af',f,'-ar','48000','-ac','2',str(DEST/'mix.wav')],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=True)
print(json.dumps({'seconds':175,'voice':'Kokoro bm_george; synthetic, not cloned','captions':len(captions),'output':'public/final175/mix.wav'}),flush=True)
