"""Repair one result-caption timing boundary without another full browser render.

The replacement is a native Remotion-rendered opaque caption band, not a game
mockup. Gameplay and the original audio timeline are preserved. A future full
render from the current TSX already includes the same corrected boundary.
"""
from pathlib import Path
import subprocess,json,hashlib,argparse,datetime

ROOT=Path(__file__).resolve().parent.parent
ap=argparse.ArgumentParser();ap.add_argument('input');ap.add_argument('output');ap.add_argument('--opening-frame');opts=ap.parse_args()
source=(ROOT/opts.input).resolve();destination=(ROOT/opts.output).resolve()
if destination.exists():raise ValueError('Preserve existing export; choose a new output')
work=ROOT/'out/trailer150-finishing';work.mkdir(parents=True,exist_ok=True)
frame=ROOT/'out/trailer150-final-caption-fix/1335.png'
patch=work/'caption-band.png'
def run(args,log):
    p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True)
    (work/log).write_text(p.stderr,encoding='utf8')
    if p.returncode:raise RuntimeError(p.stderr[-1400:])
probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,width,height,nb_frames','-of','json',str(source)],capture_output=True,text=True,check=True)
v=next(v for v in json.loads(probe.stdout)['streams'] if v['codec_type']=='video')
if (v['width'],v['height'],int(v['nb_frames']))!=(1920,1080,4500):raise ValueError('Unexpected input contract')
run(['ffmpeg','-hide_banner','-v','error','-y','-i',str(frame),'-vf','crop=1920:108:0:972','-frames:v','1',str(patch)],'caption.log')
inputs=['-i',str(source),'-i',str(patch)]
graph="[0:v][1:v]overlay=x=0:y=972:enable='between(n,1320,1359)'[base];"
if opts.opening_frame:
    opening=(ROOT/opts.opening_frame).resolve()
    inputs+=['-i',str(opening)]
    graph+="[base][2:v]overlay=x=0:y=0:enable='eq(n,0)',format=yuv420p[v]"
else:
    graph+='[base]format=yuv420p[v]'
run(['ffmpeg','-hide_banner','-v','error','-y','-filter_complex_threads','1',*inputs,
     '-filter_complex',graph,
     '-map','[v]','-map','0:a:0','-c:v','libx264','-crf','14','-preset','fast','-threads','2',
     '-r','30','-fps_mode','cfr','-frames:v','4500','-c:a','copy','-t','150',
     '-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709',
     '-movflags','+faststart',str(destination)],'finish.log')
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(work/'manifest.json').write_text(json.dumps({'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'input':str(source),'inputSHA256':digest(source),'output':str(destination),'outputSHA256':digest(destination),
 'repair':{'startFrame':1320,'endFrameInclusive':1359,'sourceFrame':str(frame),'region':[0,972,1920,108],
 'reason':'Wait for the native robot conclusion text before displaying a verified-result caption.'},
 'openingFrameRepair':{'frame':0,'source':str(opening),'reason':'Replace first JPEG screenshot tiling; native PNG render smoke test is correct.'} if opts.opening_frame else None,
 'gameplayUnaltered':True,'audio':'Original encoded audio copied without timing changes','frames':4500,'fps':30},indent=2))
print(json.dumps({'finished':str(destination),'frames':4500,'seconds':150}))
