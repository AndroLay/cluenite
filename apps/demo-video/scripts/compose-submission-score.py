"""Original 175-second chamber-noir cue; deterministic synthesis, no samples."""
from pathlib import Path
import json
import subprocess
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/submission'
OUT.mkdir(parents=True, exist_ok=True)
SR, SECONDS = 48000, 175
music = np.zeros((SR * SECONDS, 2), dtype=np.float32)
rng = np.random.default_rng(20261103)

def hz(note):
    return 440 * 2 ** ((note - 69) / 12)

def add(at, signal, gain=1, pan=0):
    offset = round(at * SR)
    if offset < 0 or offset >= len(music):
        return
    signal = signal[:len(music)-offset] * gain
    music[offset:offset+len(signal),0] += signal * np.sqrt((1-pan)/2)
    music[offset:offset+len(signal),1] += signal * np.sqrt((1+pan)/2)

def pluck(note, length=.9, soft=False):
    t = np.arange(round(length * SR), dtype=np.float32) / SR
    fundamental = np.sin(2*np.pi*hz(note)*t) * np.exp(-t*(3.8 if soft else 6.4))
    partial = .18*np.sin(2*np.pi*hz(note)*2.01*t)*np.exp(-t*15)
    return ((fundamental+partial)*(1-np.exp(-t*650))*.22).astype(np.float32)

def bass(note):
    t = np.arange(round(.5*SR), dtype=np.float32) / SR
    return ((np.sin(2*np.pi*hz(note)*t)+.18*np.sin(4*np.pi*hz(note)*t))*
            (1-np.exp(-t*230))*np.exp(-t*7)*.24).astype(np.float32)

def brush():
    t = np.arange(round(.075*SR), dtype=np.float32) / SR
    noise = rng.normal(0,.06,len(t)).astype(np.float32)
    noise[1:] -= noise[:-1]*.94
    return noise*np.exp(-t*55)*(1-np.exp(-t*1200))

def energy(at):
    if at < 12: return .13
    if at < 35: return .37
    if at < 52: return .26
    if at < 80: return .34
    if at < 86: return .14
    if at < 105: return .40
    if at < 137: return .47
    if at < 160: return .17
    return .24

beat = 60/108
roots = [38,34,31,33]
motifs = [[74,None,77,76,None,69,72,None],
          [74,None,72,69,None,65,69,None],
          [70,None,74,77,None,74,72,None],
          [73,None,76,79,None,76,73,None]]
for bar in range(80):
    start = 5 + bar*4*beat
    if start > 169:
        break
    amplitude = energy(start)
    root = roots[bar%4]
    for i,note in enumerate([root,root+7,root+12,root+7]):
        add(start+i*beat,bass(note),amplitude*.7)
    for i in range(8):
        add(start+(i+.5)*beat/2,brush(),amplitude*.65,(-.2 if i%2 else .2))
    if bar%2==0:
        for i,note in enumerate(motifs[(bar//2)%4]):
            if note is not None:
                add(start+i*beat/2,pluck(note),amplitude*.6,(-.2 if i%2 else .2))
    else:
        for j,note in enumerate([62,65,69,74]):
            add(start+beat+j*.035,pluck(note+12,1.5,True),amplitude*.12,(j-1.5)*.12)

# The question and the final resolution have room around them.
for at,note in [(0.7,74),(2.8,77),(4.2,76),(10.5,69)]:
    add(at,pluck(note,1.8,True),.12,-.1)
for at in [16.6,42,46.4,86,91.4,117,124,131]:
    add(at,pluck(86,.35),.12,.2)
for j,note in enumerate([50,62,65,69,71,76]):
    add(169.4+j*.045,pluck(note,4,True),.30,(j-2.5)*.12)

fade_in = np.minimum(np.arange(len(music))/(SR*.15),1)
fade_out = np.minimum((len(music)-1-np.arange(len(music)))/(SR*1.1),1)
music *= (fade_in*fade_out)[:,None]
sf.write(OUT/'score-source.wav',np.tanh(music*1.3)*.65,SR,subtype='PCM_16')
probe = subprocess.run([
    'ffmpeg','-hide_banner','-i',str(OUT/'score-source.wav'),
    '-af','loudnorm=I=-23:TP=-5:LRA=9:print_format=json','-f','null','-'
],capture_output=True,text=True,check=True)
stats,_ = json.JSONDecoder().raw_decode(probe.stderr[probe.stderr.rfind('{'):])
normal = ('loudnorm=I=-23:TP=-5:LRA=9:linear=true:'
          f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
          f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}")
subprocess.run([
    'ffmpeg','-hide_banner','-v','error','-y','-i',str(OUT/'score-source.wav'),
    '-af',normal,'-ar',str(SR),'-ac','2','-c:a','pcm_s16le',str(OUT/'score.wav')
],check=True)
(OUT/'score-provenance.json').write_text(json.dumps({
    'seconds':175,'sampleRate':SR,'source':'Original authored deterministic synthesis; no reference soundtrack or samples',
    'tempo':108,'targetIntegratedLufs':-23,'measurements':stats,
    'review':'Meters only; listening not verified'
},indent=2))
print(json.dumps({'scoreSeconds':175,'targetLufs':-23,'originalSynthesis':True}),flush=True)
