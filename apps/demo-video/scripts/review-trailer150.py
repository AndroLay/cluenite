"""Inspect every authored cut and important reaction in the current MP4.

This makes 720p reading frames and a contact sheet from the exported artifact,
not source screenshots. It does not certify normal-speed playback or listening.
"""
from pathlib import Path
import subprocess,json,argparse,hashlib,math

ROOT=Path(__file__).resolve().parent.parent
ap=argparse.ArgumentParser();ap.add_argument('video');ap.add_argument('output');args=ap.parse_args()
video=(ROOT/args.video).resolve();out=(ROOT/args.output).resolve()
out.mkdir(parents=True,exist_ok=False)
shots=json.loads((ROOT/'src/trailer150/edit.generated.json').read_text())['shots']
frames={0,105,239,240,419,435,810,1119,1184,1259,1319,1320,1335,1359,1360,1469,1470,
 2195,2273,2386,2410,2699,2700,3235,3449,3450,4000,4007,4169,4170,4195,4319,4320,4400,4481,4499}
for shot in shots:
    frames.add(round((shot['start']+min(.7,shot['seconds']/2))*30))
    frames.add(round((shot['start']+shot['seconds']/2)*30))
frames=sorted(frames)
def expression(values):
    # FFmpeg limits expression recursion. A balanced tree supports the full
    # cut/reaction list without the depth of a long left-associative sum.
    if len(values)==1:return f'eq(n,{values[0]})'
    mid=len(values)//2
    return '('+expression(values[:mid])+'+'+expression(values[mid:])+')'
select=expression(frames)
vf="select='"+select+"',scale=1280:720:flags=lanczos,drawtext=fontfile=public/fonts/Inter-variable.ttf:text='%{pts\\:hms}':x=20:y=20:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.8:boxborderw=6"
p=subprocess.run(['ffmpeg','-hide_banner','-v','error','-y','-threads','2','-i',str(video),'-vf',vf,'-fps_mode','vfr','-q:v','2',str(out/'frame-%03d.jpg')],cwd=ROOT,capture_output=True,text=True)
(out/'extract.log').write_text(p.stderr)
if p.returncode:raise RuntimeError(p.stderr[-1400:])
files=sorted(out.glob('frame-*.jpg'))
if len(files)!=len(frames):raise ValueError('Incomplete frame coverage')
listing=out/'frames.concat.txt';listing.write_text(''.join("file '"+p.as_posix()+"'\n" for p in files))
rows=math.ceil(len(files)/6)
p=subprocess.run(['ffmpeg','-hide_banner','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-vf',f'scale=320:180,tile=6x{rows}:nb_frames={len(files)}:padding=4:margin=4:color=0x100d0a','-frames:v','1','-q:v','2',str(out/'storyboard.jpg')],cwd=ROOT,capture_output=True,text=True)
(out/'contact.log').write_text(p.stderr)
if p.returncode:raise RuntimeError(p.stderr[-1200:])
report={'video':str(video),'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'viewingSize':[1280,720],
 'coverage':'Still frames at every cut, shot midpoint and selected reaction/transition frames; no full playback/listening claim',
 'frames':[{'file':p.name,'frame':f,'seconds':round(f/30,4)} for p,f in zip(files,frames)]}
(out/'coverage.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'frames':len(files),'storyboard':str(out/'storyboard.jpg'),'sha256':report['sha256']}))
