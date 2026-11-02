"""Thirty-second editorial study using native Cluenite UI and real OBS proof.

The UI replay is explicitly labeled. The inset is the original verified capture.
No gallery backdrop, fake chat, new artwork, synthetic voice or reference media.
"""
from pathlib import Path
import json
import subprocess
import wave
import numpy as np

ROOT=Path(__file__).resolve().parent.parent
WORK=ROOT/'out/native-opening-v3'
FONT='public/fonts/Inter-variable.ttf'
SERIF='public/fonts/EBGaramond-variable.ttf'
INK='0x100d0a'
PAPER='0xe9decb'
GOLD='0xd9b681'
meta=json.loads((WORK/'provenance.json').read_text())
assert meta['pageErrors']==[] and meta['verifiedEventSubReceipt']
assert meta['type']=='Native UI replay, not a new Twitch recording'
offset=meta['videoOffset']

def run(args, name):
    result=subprocess.run(args,cwd=ROOT,capture_output=True,text=True)
    (WORK/(name+'.log')).write_text(result.stderr,encoding='utf8')
    if result.returncode: raise RuntimeError(result.stderr[-1400:])

def text(name,value,x,y,size=24,font=FONT,color=PAPER,extra=''):
    file=WORK/(name+'.txt')
    file.write_text(value,encoding='utf8')
    return (f'drawtext=fontfile={font}:textfile={file.relative_to(ROOT).as_posix()}:'
            f'expansion=none:x={x}:y={y}:fontsize={size}:fontcolor={color}'
            +(':'+extra if extra else ''))

def encode(name,duration,inputs,filters):
    dest=WORK/(name+'.mp4')
    args=['ffmpeg','-hide_banner','-v','error','-y','-filter_complex_threads','1']+inputs
    graph=';'.join(filters)
    (WORK/(name+'.ffgraph')).write_text(graph,encoding='utf8')
    args+=['-filter_complex',graph,'-map','[out]','-an','-t',str(duration),
           '-frames:v',str(round(duration*30)),'-c:v','libx264','-crf','16',
           '-preset','fast','-threads','2','-pix_fmt','yuv420p',
           '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',
           '-movflags','+faststart',str(dest)]
    run(args,name)
    print(json.dumps({'rendered':name,'seconds':duration}),flush=True)
    return dest

def still(name,duration,image,y,move=0,caption='',definition=False):
    # A crop of the real responsive UI, captured at device scale 2. Camera stops
    # before the reading hold. No text, color or component geometry is recreated.
    base=(f'[0:v]crop=2400:1350:0:y=\'{y}+({move})*min(t/1.5,1)\','
          'scale=1920:1080:flags=lanczos,setsar=1,fps=30')
    additions=[text(name+'-replay','Native UI replay',72,1025,size=18,color=GOLD,
                    extra=f'box=1:boxcolor={INK}@0.94:boxborderw=8')]
    if definition:
        additions += [f'drawbox=x=0:y=905:w=1920:h=175:color={INK}@0.97:t=fill',
                      text(name+'-brand','Cluenite',72,924,size=47,font=SERIF),
                      text(name+'-definition','A mystery game for streamers and Twitch chat.',72,991,size=28)]
    if caption:
        additions += [text(name+'-caption',caption,72,58,size=29,
                           extra=f'box=1:boxcolor={INK}@0.96:boxborderw=13')]
    return encode(name,duration,['-loop','1','-framerate','30','-i',str(WORK/image)],
                  [base+','+','.join(additions)+',format=yuv420p[out]'])

parts=[]
parts.append(still('01-question',3.5,'before.png',1280,move=100))
parts.append(encode('02-native-room',4.5,
    ['-ss',str(offset),'-t','4.4','-i',str(WORK/'native-replay.webm')],
    ['[0:v]setpts=PTS-STARTPTS,crop=1200:675:0:100,scale=1920:1080:flags=lanczos,'
     'tpad=stop_mode=clone:stop_duration=2,fps=30,setsar=1,'+
     text('02-replay','Native UI replay',72,1025,size=18,color=GOLD,
          extra=f'box=1:boxcolor={INK}@0.94:boxborderw=8')+',format=yuv420p[out]']))
parts.append(still('03-definition',4,'before.png',1020,move=210,definition=True))
parts.append(still('04-camera-choice',2,'before.png',1380,caption='Viewers play in ordinary Twitch chat.'))

# One input, two views. The native replay and original recording show the same
# CAM change simultaneously; the inset never imitates Twitch's chat interface.
duration=7
native_start=offset+meta['acceptedAt']-1.4
real_event=30.28-11.91
real_start=real_event-1.4
inputs=['-ss',str(native_start),'-t','6','-i',str(WORK/'native-replay.webm'),
        '-ss',str(real_start),'-t',str(duration),'-i',str(ROOT/'out/live-capture-2026-11-02T15-44-56-890Z/q01-overlay.webm')]
filters=[
 '[0:v]setpts=PTS-STARTPTS,crop=1200:675:0:815,scale=1920:1080:flags=lanczos,'
 'tpad=stop_mode=clone:stop_duration=3,fps=30,setsar=1[main]',
 '[1:v]setpts=PTS-STARTPTS,crop=540:296:24:760,colorkey=0xffffff:0.04:0.01,'
 'scale=648:356:flags=lanczos,fps=30[proof]',
 '[main]drawbox=x=1208:y=655:w=660:h=365:color=0x100d0a@0.98:t=fill[back]',
 '[back][proof]overlay=1214:660:shortest=1[paired]',
 '[paired]'+text('05-command','Recorded Twitch input:  !look CAM',72,60,size=29,
  extra=f'box=1:boxcolor={INK}@0.97:boxborderw=14')+','+
 text('05-source','Recorded OBS source',1226,619,size=19,color=GOLD,
  extra=f'box=1:boxcolor={INK}@0.95:boxborderw=7')+','+
 text('05-replay','Native UI replay',72,1025,size=18,color=GOLD,
  extra=f'box=1:boxcolor={INK}@0.94:boxborderw=8')+',format=yuv420p[out]'
]
parts.append(encode('05-input-to-clue',duration,inputs,filters))
parts.append(still('06-reading-hold',5,'after.png',1540))
parts.append(still('07-next-lead',4,'after.png',1260,move=100))
assert sum([3.5,4.5,4,2,7,5,4])==30
listing=WORK/'parts.txt'
listing.write_text(''.join("file '"+p.as_posix()+"'\n" for p in parts))
picture=WORK/'picture.mp4'
run(['ffmpeg','-hide_banner','-v','error','-y','-f','concat','-safe','0','-i',str(listing),
     '-map','0:v:0','-an','-c','copy',str(picture)],'concat')

# Original quiet room tone and short editorial Foley; no music bed or TTS.
sr=48000
rng=np.random.default_rng(3112026)
audio=np.zeros(sr*30,dtype=np.float64)
noise=rng.normal(0,1,len(audio))
room=np.convolve(noise,np.ones(40)/40,mode='same')*0.008
audio+=room
for at in [0.4,1.4,2.4,3.4]:
    t=np.arange(int(sr*.07))/sr
    tap=(np.sin(2*np.pi*1350*t)+.3*np.sin(2*np.pi*2200*t))*np.exp(-t*95)*.065
    i=int(at*sr);audio[i:i+len(tap)]+=tap
for at in [14.1,14.23,14.4]:
    t=np.arange(int(sr*.035))/sr
    tap=rng.normal(0,1,len(t))*np.exp(-t*170)*.15
    i=int(at*sr);audio[i:i+len(tap)]+=tap
at=15.4
t=np.arange(int(sr*.4))/sr
paper=rng.normal(0,1,len(t))*np.sin(np.pi*np.minimum(1,t/.4))**2*.028
i=int(at*sr);audio[i:i+len(paper)]+=paper
audio*=np.minimum(1,np.arange(len(audio))/(sr*.15))
audio*=np.minimum(1,(len(audio)-np.arange(len(audio)))/(sr*.3))
with wave.open(str(WORK/'editorial-foley.wav'),'wb') as file:
    file.setnchannels(2);file.setsampwidth(2);file.setframerate(sr)
    file.writeframes(np.column_stack([audio,audio*.96]).clip(-1,1).__mul__(32767).astype('<i2').tobytes())
final=ROOT/'out/Cluenite-First-30s-v3-Native.mp4'
run(['ffmpeg','-hide_banner','-v','error','-y','-i',str(picture),'-i',str(WORK/'editorial-foley.wav'),
     '-map','0:v:0','-map','1:a:0','-t','30','-c:v','copy','-c:a','aac','-b:a','192k',
     '-ar','48000','-ac','2','-af','alimiter=limit=0.89','-movflags','+faststart',str(final)],'final')
(WORK/'edit-plan.json').write_text(json.dumps({'seconds':30,'parts':[p.name for p in parts],
 'nativeReplay':True,'realTwitchReceipt':True,'voiceover':False,
 'newIllustrations':False,'referenceMediaUsed':False,
 'status':'Creative study, not an approved final 175-second film'},indent=2))
print(json.dumps({'output':str(final),'duration':30,'narration':False}),flush=True)
