"""Conform existing genuine Practice Case material; leave live gameplay empty."""
from pathlib import Path
import hashlib,json,subprocess,wave,shutil
import numpy as np

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'out/practice165-preparation';OUT.mkdir(parents=True,exist_ok=True)
DEST=ROOT/'public/practice165';DEST.mkdir(parents=True,exist_ok=True)

def run(args):
    p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True)
    if p.returncode:raise RuntimeError(p.stderr[-2200:])
    return p

def conform(source,dest,frames,vf):
    run(['ffmpeg','-hide_banner','-v','error','-y','-threads','2','-i',str(source),'-an','-vf',vf,
      '-frames:v',str(frames),'-r','30','-fps_mode','cfr','-c:v','libx264','-preset','fast','-crf','14','-threads','2',
      '-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',str(dest)])
    data=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=nb_frames,width,height,avg_frame_rate','-of','json',str(dest)]).stdout)['streams'][0]
    if (int(data['nb_frames']),data['width'],data['height'],data['avg_frame_rate'])!=(frames,1920,1080,'30/1'):
        raise ValueError('Frame contract failed: '+str(dest))

reference=ROOT/'out/Cluenite-Demo-90s-v1.mp4'
conform(reference,DEST/'practice-edit.mp4',1890,"trim=start_frame=420:end_frame=2310,setpts=PTS-STARTPTS,select='not(eq(n,210))',fps=30:start_time=0")
run(['ffmpeg','-hide_banner','-v','error','-y','-ss','62.9666667','-i',str(DEST/'practice-edit.mp4'),'-frames:v','1',str(DEST/'practice-out.png')])
development=ROOT/'out/trailer150-development/development.webm'
conform(development,DEST/'development.mp4',810,'trim=start=0.81,setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=2')
mode=ROOT/'out/practice165-context/mode-selection.webm'
mode_duration=float(run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(mode)]).stdout)
mode_start=max(0,mode_duration-10)
conform(mode,DEST/'mode-selection.mp4',300,f'trim=start={mode_start},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=1')
shutil.copyfile(ROOT/'out/practice165-context/mode-selection.png',DEST/'mode-selection.png')

# An original quiet interlude leaves room for the eventual real game audio.
sr=48000;t=np.arange(40*sr)/sr
rng=np.random.default_rng(1652026)
noise=np.convolve(rng.normal(0,1,len(t)),np.ones(120)/120,mode='same')*.004
env=np.minimum(1,t/1.5)*np.minimum(1,(40-t)/1.5)
bed=(np.sin(2*np.pi*73.416*t)*.012+np.sin(2*np.pi*110*t)*.004+noise)*env
with wave.open(str(OUT/'interlude.wav'),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr)
    w.writeframes((np.stack([bed,bed*.97],axis=1)*32767).astype('<i2').tobytes())

parts=[(0,0,15),(1,14,77),(0,85,95),(2,0,40),(0,115,142),(0,140,150)]
filters=[]
for n,(src,a,b) in enumerate(parts):
    duration=b-a
    filters.append(f'[{src}:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:d=0.09,afade=t=out:st={duration-.12}:d=0.12[a{n}]')
filters.append(''.join(f'[a{n}]' for n in range(len(parts)))+'concat=n=6:v=0:a=1[music]')
premaster=OUT/'premaster.wav'
run(['ffmpeg','-hide_banner','-v','error','-y','-i','public/trailer150/score.wav','-i','public/commercial/score.wav','-i',str(OUT/'interlude.wav'),
 '-filter_complex',';'.join(filters),'-map','[music]','-ar','48000','-ac','2','-c:a','pcm_s16le',str(premaster)])
analysis=run(['ffmpeg','-hide_banner','-i',str(premaster),'-af','loudnorm=I=-19:TP=-1.5:LRA=8:print_format=json','-f','null','-'])
measure=json.JSONDecoder().raw_decode(analysis.stderr[analysis.stderr.rfind('{'):])[0]
af='loudnorm=I=-19:TP=-1.5:LRA=8:linear=true:'+':'.join(['measured_I='+measure['input_i'],'measured_TP='+measure['input_tp'],'measured_LRA='+measure['input_lra'],'measured_thresh='+measure['input_thresh'],'offset='+measure['target_offset']])
run(['ffmpeg','-hide_banner','-v','error','-y','-i',str(premaster),'-af',af,'-ar','48000','-ac','2','-c:a','pcm_s16le',str(DEST/'score.wav')])

hash_file=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report={'duration':165,'frames':4950,'fps':30,'practice':{'source':str(reference.relative_to(ROOT)),'sha256':hash_file(reference),'sourceFrames':[420,2310],'filmSeconds':[15,78],'corruptSourceFrame':630,'repair':'Drop one tiled source frame; retain exact duration with an adjacent genuine frame hold.','provenance':'public/commercial/editorial-manifest.json','label':'Practice Case / scripted chat; not Twitch'},
 'development':{'source':str(development.relative_to(ROOT)),'sha256':hash_file(development),'sourceIn':.81,'filmSeconds':[128,155],'codexSessionRecording':False,'manifest':'out/trailer150-development/manifest.json'},
 'modes':{'source':str(mode.relative_to(ROOT)),'sourceIn':mode_start,'captureManifest':'out/practice165-context/manifest.json'},
 'live':{'filmSeconds':[88,128],'media':None,'reason':'Owner requested an empty slot until final gameplay is ready; no old live clips substituted.'},
 'audio':{'original':True,'borrowedSamples':False,'narration':False,'parts':parts,'targetLUFS':-19},
 'outputs':{p.name:{'bytes':p.stat().st_size,'sha256':hash_file(p)} for p in DEST.glob('*') if p.is_file()}}
(OUT/'manifest.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'prepared':165,'practiceFrames':1890,'liveFramesReserved':1200}))
