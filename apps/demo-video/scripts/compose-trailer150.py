"""Original chamber suspense cue and editorial Foley; no samples or TTS.

Sound follows actual discoveries. The cue leaves reading space at evidence,
contradiction and test results, with its only full cadence at the final reveal.
"""
from pathlib import Path
import json,subprocess,wave
import numpy as np

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'out/trailer150-audio';OUT.mkdir(parents=True,exist_ok=True)
SR=48000;N=150*SR
rng=np.random.default_rng(1503112026)
mix=np.zeros((N,2),np.float64)
events=[]

def add(at,sound,pan=0):
    i=round(at*SR);n=min(len(sound),N-i)
    if n<=0:return
    mix[i:i+n,0]+=sound[:n]*(1-pan*.35)
    mix[i:i+n,1]+=sound[:n]*(1+pan*.35)

def pluck(at,hz,level=.045,length=1.5,pan=0):
    t=np.arange(round(SR*length))/SR
    a=np.minimum(1,t/.008)
    s=sum(np.sin(2*np.pi*hz*k*t)*np.exp(-t*(2.9+k*1.1))/k**1.7 for k in range(1,6))
    add(at,np.tanh(s)*a*level,pan)
    add(at+.13,s*a*level*.14,-pan)

def bow(at,hz,length,level=.014,pan=0):
    t=np.arange(round(SR*length))/SR
    env=np.minimum(1,t/1.4)*np.minimum(1,(length-t)/1.8)
    s=sum(np.sin(2*np.pi*hz*k*t+.0018*np.sin(2*np.pi*3.7*t))/k**2 for k in range(1,5))
    add(at,s*env*level,pan)

def paper(at,level=.016):
    t=np.arange(round(SR*.29))/SR
    noise=rng.normal(0,1,len(t));noise=np.convolve(noise,[.2,.6,.2],mode='same')
    add(at,noise*np.sin(np.pi*t/.29)**2*level,.16)
    events.append({'at':at,'type':'paper','original':True})

def contact(at,level=.022,hz=1300):
    t=np.arange(round(SR*.08))/SR
    add(at,(np.sin(2*np.pi*hz*t)*.7+rng.normal(0,.22,len(t)))*np.exp(-t*110)*level,-.08)

# Warm room tone; no synthetic audience or fabricated game dialogue.
noise=rng.normal(0,1,N)
room=np.convolve(noise,np.ones(96)/96,mode='same')*.007
mix[:,0]+=room;mix[:,1]+=room*.94

# D minor is unresolved through the mystery; the final cue opens into D/F/A.
sections=[(0,8,73.416,.013),(8,35,73.416,.012),(35,49,87.307,.012),
 (49,67,65.406,.014),(67,85,73.416,.017),(85,90,87.307,.012),
 (90,115,73.416,.015),(115,136,65.406,.012),(136,140,73.416,.018),
 (140,149,73.416,.013)]
for start,end,hz,level in sections:
    bow(start,hz,end-start,level,-.2)
    bow(start+.1,hz*1.5,end-start-.1,level*.36,.25)

motif=[146.832,220,174.614,164.814]
for start,end,step,level in [(8,34,6,.047),(49,66,5,.05),(67,84,3.3,.046),
 (90,113,4.8,.05),(115,135,5.1,.042)]:
    for j,at in enumerate(np.arange(start+.35,end-1,step)):
        pluck(float(at),motif[j%4],level,pan=-.18)
        pluck(float(at)+.59,motif[(j+1)%4]*2,level*.58,pan=.18)

for at in [.42,1.82,3.42,6.92]:contact(at,.015,880)
for at in [11.2,22.2,35.2,42.2,90.2,96.2,100.2,105.2,139.2]:
    for k in range(3):contact(at+k*.065,.019,1350+k*170)
for at in [13.29,24.59,26.86,54.43,56.44,59.35,62.53,65.04,79.56,92.19,97.7,102.68,106.87]:paper(at)

# A concise confirmation at proof/solution, not an impact on each edit.
for at in [36.73,44.0,72.39,85.15,108.0]:
    contact(at,.025,770)
    pluck(at+.03,293.665,.042,1.2,.12)
    pluck(at+.23,440,.031,1.2,-.1)
    events.append({'at':at,'type':'evidence-confirmation','original':True})
contact(67.7,.016,240)
for at,hz,level in [(136.3,146.832,.045),(137.1,174.614,.046),(137.9,220,.042),
 (139.65,293.665,.06),(140.1,349.228,.044),(140.55,440,.043),
 (144.2,146.832,.048),(144.2,220,.04),(144.2,293.665,.038),(144.2,349.228,.028)]:
    pluck(at,hz,level,3.1,.12 if hz>300 else -.12)

fade=np.minimum(1,np.arange(N)/(SR*.12))*np.minimum(1,(N-np.arange(N))/(SR*1.2))
mix*=fade[:,None]
mix*=min(1,.75/max(float(np.max(np.abs(mix))),1e-9))
raw=OUT/'original-premaster.wav'
with wave.open(str(raw),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR)
    w.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())

analysis=subprocess.run(['ffmpeg','-hide_banner','-i',str(raw),'-af','loudnorm=I=-19:TP=-1.5:LRA=8:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
measure=json.JSONDecoder().raw_decode(analysis.stderr[analysis.stderr.rfind('{'):])[0]
af=('loudnorm=I=-19:TP=-1.5:LRA=8:linear=true:'+':'.join([
 'measured_I='+measure['input_i'],'measured_TP='+measure['input_tp'],
 'measured_LRA='+measure['input_lra'],'measured_thresh='+measure['input_thresh'],
 'offset='+measure['target_offset']]))
out=ROOT/'public/trailer150/score.wav'
subprocess.run(['ffmpeg','-hide_banner','-v','error','-y','-i',str(raw),'-af',af,'-ar','48000','-ac','2','-c:a','pcm_s16le',str(out)],check=True)
(OUT/'composition.json').write_text(json.dumps({'original':True,'samples':False,'syntheticNarration':False,'duration':150,'sampleRate':SR,'targetLUFS':-19,'maxTruePeak':-1.5,'events':events,'premasterMeasurement':measure},indent=2))
print(json.dumps({'originalScore':str(out),'seconds':150,'events':len(events)}))
