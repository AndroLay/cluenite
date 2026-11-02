"""Compose an original, deterministic detective score from synthesis.

No sampled music, external soundtrack, voice model, or generative service is used.
The written melody, chord progression, arrangement, and edit cues live here.
"""
from pathlib import Path
import json
import subprocess
import wave
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "commercial"
OUT.mkdir(parents=True, exist_ok=True)
SR = 48000
SECONDS = 90
RNG = np.random.default_rng(20261102)
mix = np.zeros((SECONDS * SR, 2), dtype=np.float32)

def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)

def add(at, signal, gain=1.0, pan=0.0):
    start = round(at * SR)
    if start < 0 or start >= len(mix):
        return
    end = min(len(mix), start + len(signal))
    signal = signal[:end-start] * gain
    mix[start:end, 0] += signal * np.sqrt((1-pan)/2)
    mix[start:end, 1] += signal * np.sqrt((1+pan)/2)

def mallet(midi, length=.85, soft=False):
    t = np.arange(round(length * SR), dtype=np.float32) / SR
    f = hz(midi)
    # Inharmonic partials and a rounded attack produce a quiet glass/wood tone.
    attack = 1-np.exp(-t*650)
    sig = np.sin(2*np.pi*f*t)*np.exp(-t*(4.5 if soft else 7))
    sig += .22*np.sin(2*np.pi*f*2.01*t)*np.exp(-t*17)
    sig += .065*np.sin(2*np.pi*f*3.97*t)*np.exp(-t*33)
    return (sig*attack*.22).astype(np.float32)

def bass(midi, length=.48):
    t = np.arange(round(length * SR), dtype=np.float32) / SR
    f = hz(midi)
    sig = np.sin(2*np.pi*f*t)+.30*np.sin(4*np.pi*f*t)+.1*np.sin(6*np.pi*f*t)
    return (sig * (1-np.exp(-t*280))*np.exp(-t*7)*.28).astype(np.float32)

def brush(length=.09):
    count=round(length*SR)
    noise=RNG.normal(0,.16,count).astype(np.float32)
    # Differencing shapes the sound toward the soft high-frequency brush band.
    noise[1:]-=noise[:-1]*.96
    t=np.arange(count)/SR
    return (noise*np.exp(-t*48)*(1-np.exp(-t*1200))*.35).astype(np.float32)

def kick():
    t=np.arange(round(.16*SR))/SR
    phase=2*np.pi*(47*t+3.5*(1-np.exp(-t*35)))
    return (np.sin(phase)*np.exp(-t*32)*.21).astype(np.float32)

def paper(at, gain=.1):
    t=np.arange(round(.21*SR))/SR
    a=RNG.normal(0,.2,len(t))
    a=np.convolve(a,np.ones(11)/11,mode='same')
    add(at,a*np.sin(np.pi*np.minimum(t/.21,1))**2,gain,-.25)

def tick(at,gain=.12,high=False):
    t=np.arange(round(.10*SR))/SR
    a=(np.sin(2*np.pi*(1600 if high else 1050)*t)+.2*np.sin(2*np.pi*2750*t))*np.exp(-t*100)
    add(at,a,gain,.15 if high else -.15)

# Four editorial acts; the last motif resolves in the final branded scene.
BEAT=60/112
CHORDS=[(38,[62,65,69,72,76]),(34,[62,65,69,70,74]),(31,[62,65,67,70,74]),(33,[61,64,67,69,73])]
MELODIES=[
    [74,None,77,76,None,69,72,None],
    [74,None,72,69,None,65,69,None],
    [70,None,74,77,None,74,72,None],
    [73,None,76,79,None,76,73,None],
]

OLD_CUTS=[0,6,14,34,50,70,88,101,110,133,145,151,160]
CUTS=[0,3,14,21,29,39,49,55,60,77,84,86,90]

def cut_time(at):
    return float(np.interp(at,OLD_CUTS,CUTS))

def energy(at):
    at=float(np.interp(at,CUTS,OLD_CUTS))
    if at < 14: return .36
    if at < 34: return .92
    if at < 50: return .50
    if at < 70: return .72
    if at < 88: return .92
    if at < 101: return .58
    if at < 110: return .27
    if at < 133: return 1.0
    if at < 151: return .72
    return .37

def gap(at):
    at=float(np.interp(at,CUTS,OLD_CUTS))
    # Space before the false lead, contradiction, accusation, and final wordmark.
    return any(a < at < b for a,b in [(33.3,34.5),(87.4,88.6),(108.1,110.3),(150.2,151.5),(156.6,160)])

for bar in range(76):
    start=5+bar*4*BEAT
    if start>=cut_time(157): break
    root,chord=CHORDS[bar%4]
    e=energy(start)
    for step,note in enumerate([root,root+7,root+12,root+7]):
        at=start+step*BEAT
        if at<cut_time(157) and not gap(at): add(at,bass(note),e*.75,0)
    for step in range(8):
        at=start+(step+.5)*BEAT/2
        if at<cut_time(157) and not gap(at): add(at,brush(),e*(.32 if step%2==0 else .16),.3)
    for step in [0,2]:
        at=start+step*BEAT
        if at<cut_time(157) and not gap(at): add(at,kick(),e*.34)
    # A short original question-and-answer motif, with breathing space each bar.
    if bar%2==0:
        for step,note in enumerate(MELODIES[(bar//2)%4]):
            at=start+step*BEAT/2
            if note is not None and at<cut_time(157) and not gap(at): add(at,mallet(note),e*.65,(-.18 if step%2 else .18))
    # Sparse chord punctuation: quieter than melody and outside the bass register.
    if bar%2==1:
        for j,note in enumerate(chord[1:]):
            if not gap(start+BEAT): add(start+BEAT+j*.025,mallet(note+12,1.4,True),e*.16,(j-1.5)*.12)

# An almost inaudible room texture and a small opening clock; no unlicensed foley.
noise=RNG.normal(0,.003,len(mix)).astype(np.float32)
noise=np.convolve(noise,np.ones(18,dtype=np.float32)/18,mode='same')
mix[:,0]+=noise
mix[:,1]+=np.roll(noise,280)
for at in [0.4,1.4,2.4,3.4,4.4]: tick(at,.035,high=int(at)%2==0)
for at in [14.4,19.6,23.5,28.1,38.7,50.5,58.6,70.3,77.6,88.4,94.0,101.3,133.1,139.1]: paper(cut_time(at),.20)
for at,note in [(16.0,86),(20.2,81),(25.0,86),(55,77),(60,74),(66,81),(82.7,86),(94.3,77)]: add(cut_time(at),mallet(note),.48,-.08)

# The accusation holds its breath; the reveal lands on a warm extended minor chord.
for at in [103.5,105.0,106.5]: tick(cut_time(at),.045,True)
for j,note in enumerate([38,62,65,69,74,76]): add(cut_time(110.25)+j*.036,mallet(note,2.6,True),.56,(j-2.5)*.11)
add(cut_time(110.2),kick(),.9)
for at,note in [(151.7,74),(152.15,77),(152.65,76),(153.2,69),(154,74)]: add(cut_time(at),mallet(note,1.8,True),.62,-.12)
for j,note in enumerate([50,62,65,69,71,76]): add(cut_time(156.6)+j*.045,mallet(note,3.3,True),.57,(j-2.5)*.13)

# Deliberate opening/closing envelopes, leaving the final frame readable in silence.
fade_in=np.minimum(np.arange(len(mix))/(SR*.2),1)
fade_out=np.minimum((len(mix)-1-np.arange(len(mix)))/(SR*.85),1)
mix *= (fade_in*fade_out)[:,None]
mix=np.tanh(mix*1.35)*.72
raw=OUT/'score-source.wav'
with wave.open(str(raw),'wb') as wav:
    wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(SR)
    wav.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())

# Two-pass normalization is measured against the actual composed mix.
probe=subprocess.run(['ffmpeg','-hide_banner','-i',str(raw),'-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
stats,_=json.JSONDecoder().raw_decode(probe.stderr[probe.stderr.rfind('{'):])
filt=('loudnorm=I=-16:TP=-1.5:LRA=9:linear=true:'
      f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
      f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}")
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-af',filt,'-ar',str(SR),'-ac','2','-c:a','pcm_s16le',str(OUT/'score.wav')],check=True)
print(json.dumps({'duration':SECONDS,'sample_rate':SR,'channels':2,'target_lufs':-16,'source':'Original authored instrumental synthesis; no third-party samples or speech','first_pass':stats}))
