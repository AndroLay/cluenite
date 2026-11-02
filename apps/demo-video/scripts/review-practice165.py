"""Extract current-export cut, reading and motion samples; do not certify listening."""
from pathlib import Path
import argparse,hashlib,json,math,subprocess

ROOT=Path(__file__).resolve().parent.parent
ap=argparse.ArgumentParser();ap.add_argument('video');ap.add_argument('output');args=ap.parse_args()
video=(ROOT/args.video).resolve();out=(ROOT/args.output).resolve();out.mkdir(parents=True,exist_ok=False)
cuts=[0,108,228,240,450,660,900,1200,1500,1680,1830,1860,2220,2328,2340,2352,2440,2540,2640,2820,3060,3360,3600,3840,4009,4172,4336,4440,4650,4920,4949]
frames={n for cut in cuts for n in [cut-1,cut,cut+1] if 0<=n<4950}
frames.update(range(60,4950,120));frames=sorted(frames)
def expression(values):
    if len(values)==1:return f'eq(n,{values[0]})'
    mid=len(values)//2;return '('+expression(values[:mid])+'+'+expression(values[mid:])+')'
def run(cmd):
    p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True)
    if p.returncode:raise RuntimeError(p.stderr[-1800:])
    return p
vf="select='"+expression(frames)+"',scale=1280:720:flags=lanczos,drawtext=fontfile=public/fonts/Inter-variable.ttf:text='%{pts\\:hms}':x=20:y=20:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.8:boxborderw=6"
run(['ffmpeg','-hide_banner','-v','error','-y','-threads','2','-i',str(video),'-vf',vf,'-fps_mode','vfr','-q:v','2',str(out/'frame-%03d.jpg')])
files=sorted(out.glob('frame-*.jpg'))
if len(files)!=len(frames):raise ValueError('Frame extraction incomplete')
pages=[]
for offset in range(0,len(files),60):
    selected=files[offset:offset+60];page=offset//60+1
    listing=out/f'page-{page}.txt';listing.write_text(''.join("file '"+p.as_posix()+"'\n" for p in selected))
    dest=out/f'storyboard-{page}.jpg'
    run(['ffmpeg','-hide_banner','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-vf',f'scale=384:216,tile=5x{math.ceil(len(selected)/5)}:nb_frames={len(selected)}:padding=4:margin=4:color=0x100d0a','-frames:v','1','-q:v','2',str(dest)])
    pages.append(dest.name)
for start,duration,name in [(0,15,'opening-motion'),(21.5,1,'repaired-cut-motion'),(77.5,1.2,'chapter-handoff-motion'),(147.2,1.5,'test-result-motion')]:
    count=math.floor(duration*10)
    run(['ffmpeg','-hide_banner','-v','error','-y','-ss',str(start),'-i',str(video),'-vf',f'fps=10,scale=320:180,tile=10x{math.ceil(count/10)}:nb_frames={count}:padding=3:margin=3:color=0x100d0a','-frames:v','1',str(out/(name+'.png'))])
report={'video':str(video),'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'viewingSize':[1280,720],
 'coverage':'Cut-neighbor stills, four-second reading samples and selected 10-fps motion sheets; no complete normal-speed playback or listening claim',
 'storyboards':pages,'frames':[{'file':p.name,'frame':n,'seconds':round(n/30,4)} for p,n in zip(files,frames)]}
(out/'coverage.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'frames':len(files),'pages':pages,'sha256':report['sha256']}))
