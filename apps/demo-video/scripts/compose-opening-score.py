"""Original 30-second chamber cue and editorial Foley. No samples or TTS."""
from pathlib import Path
import wave
import numpy as np

root=Path(__file__).resolve().parent.parent
sr=48000
rng=np.random.default_rng(3112026)
mix=np.zeros((30*sr,2),dtype=np.float64)

def add(at,signal,pan=0):
    i=round(at*sr);n=min(len(signal),len(mix)-i)
    mix[i:i+n,0]+=signal[:n]*(1-pan*.35)
    mix[i:i+n,1]+=signal[:n]*(1+pan*.35)

def pluck(at,hz,level=.09,length=.8,pan=0):
    t=np.arange(round(sr*length))/sr
    attack=np.minimum(1,t/.004)
    sound=sum(np.sin(2*np.pi*hz*k*t)*np.exp(-t*(4+3*k))/k**1.35 for k in range(1,6))
    add(at,np.tanh(sound*1.2)*attack*level,pan)

def tap(at,level=.08,tone=1250):
    t=np.arange(round(sr*.075))/sr
    s=(np.sin(2*np.pi*tone*t)*.6+rng.normal(0,.35,len(t)))*np.exp(-t*100)*level
    add(at,s)

def paper(at,level=.025):
    t=np.arange(round(sr*.36))/sr
    n=rng.normal(0,1,len(t));n=np.convolve(n,[.2,.6,.2],mode='same')
    add(at,n*np.sin(np.pi*t/.36)**2*level,.12)

noise=rng.normal(0,1,len(mix))
room=np.convolve(noise,np.ones(48)/48,mode='same')*.004
mix[:,0]+=room;mix[:,1]+=room*.92
for at in [.3,1.3,2.3]:tap(at,.065)
paper(3.0,.016)
# Short, manually placed phrases; silence reserves attention for the clue text.
for at,hz,level in [(4.2,146.83,.09),(4.78,220,.07),(5.07,174.61,.06),
 (7.1,130.81,.085),(7.68,174.61,.065),(7.97,207.65,.06),
 (10.0,146.83,.08),(10.58,220,.055),
 (16.05,349.23,.04),(16.34,392,.035),
 (21.86,146.83,.08),(22.44,174.61,.055),(22.73,220,.055),
 (26.1,207.65,.07),(26.68,196,.05),(27.26,277.18,.045)]:
    pluck(at,hz,level,pan=-.15 if hz<200 else .15)
for i in range(0,9,2):tap(12.533+i*.1,.08,1700+i*40)
paper(15.533,.045)
tap(15.55,.045,740)
paper(21.82,.027)
tap(26.5,.035,640)
fade=np.minimum(1,np.arange(len(mix))/(sr*.08))*np.minimum(1,(len(mix)-np.arange(len(mix)))/(sr*.45))
mix*=fade[:,None]
peak=np.max(np.abs(mix))
mix*=.55/max(peak,.55)
out=root/'public/submission/native-opening/score-and-foley.wav'
with wave.open(str(out),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr)
    f.writeframes((mix.clip(-1,1)*32767).astype('<i2').tobytes())
print('Original 30-second score and Foley prepared.')
