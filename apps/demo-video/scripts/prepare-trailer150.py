"""Prepare a 150-second edit from genuine Cluenite recordings.

Every shot retains its original source/time range. No sample footage, UI replay,
reference film, provider message or gameplay outcome is synthesized here.
"""
from pathlib import Path
import json, subprocess, hashlib, argparse, math
import shutil

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'out/trailer150-edit'
PUBLIC=ROOT/'public/trailer150'
OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
RAW=[ROOT/'out'/name for name in [
 'live-capture-2026-11-02T15-44-56-890Z',
 'live-capture-2026-11-02T16-17-38-150Z',
 'live-capture-2026-11-02T16-34-01-658Z',
 'live-capture-2026-11-02T16-40-29-628Z']]
manifests=[json.loads((p/'manifest.json').read_text()) for p in RAW]
assert all(m['originalRuntimeRestored'] and m['originalRoundsUnchanged'] for m in manifests)
assert manifests[-1]['ok'] and manifests[-1]['acceptedMessages']==13
assert all(m['eventSubReceipt'] for src in manifests for m in src['messages'])
qhost=RAW[0]/'q01-host.webm';qoverlay=RAW[0]/'q01-overlay.webm'
qsolve=RAW[1]/'q01-overlay.webm';m=RAW[2]/'m01.webm'
a0=RAW[2]/'coop-A.webm';a=RAW[3]/'coop-A.webm';b=RAW[3]/'coop-B.webm'
devdir=ROOT/'out/trailer150-development'
dev=json.loads((devdir/'manifest.json').read_text())
assert dev['exitCode']==0 and not dev['pageErrors'] and not dev['codexSessionRecording']
shots=[]
def add(id,seconds,source,start,crop=None,chapter='',caption='',command='',push=0,kind='native',second=None,second_start=0):
    at=sum(s['seconds'] for s in shots)
    shots.append(dict(id=id,start=at,end=at+seconds,seconds=seconds,source=str(source),
      inPoint=start,crop=crop,chapter=chapter,caption=caption,command=command,
      push=push,kind=kind,second=str(second) if second else None,secondIn=second_start))

# Q01: one actual round continued across captures. Host setup/session IDs are
# outside every source crop. Command captions are editorial, not a fake chat UI.
add('H01',4,qhost,4,[100,685,900,340],'HOOK',push=.04)
add('H02',4,qhost,8,[145,712,760,287],'HOOK',push=.018)
add('Q01',3,qhost,13,[100,560,1720,500],'TWITCH',caption='Your viewers are no longer just watching.')
add('Q02',5,qoverlay,16.1,[24,852,540,204],'TWITCH',command='!look CAM',caption="They’re solving the mystery with you.")
add('Q03',6,qhost,23,[1034,684,774,354],'TWITCH',caption='A low, fast object. Tag R-07.')
add('Q04',4,qhost,37.5,[1010,570,850,485],'TWITCH',command='!look SCHEDULE')
add('Q05',5,qoverlay,37.2,[24,817,540,239],'TWITCH',caption='The same tag. A matching time window.')
add('Q06',4,qhost,40.1,[1034,684,774,354],'TWITCH')
assert sum(s['seconds'] for s in shots)==35
add('B01',4.5,qoverlay,40.4,[24,782,540,274],'BREAKTHROUGH',command='!link CAM_R07 SCHEDULE_R07',caption='Two observations. One connection.')
add('B02',2.5,qhost,44.4,[1034,684,774,354],'BREAKTHROUGH')
add('B03',7,qsolve,.8,[24,665,540,391],'BREAKTHROUGH',command='!solve ROBOT',caption='Verified: the cleaning robot crossed the sensor.')
assert sum(s['seconds'] for s in shots)==49

# M01: actual authenticated host actions and server responses, never labeled
# as Twitch chat commands. Reading holds are within moving original recordings.
add('M01',4,m,1.5,None,'MYSTERY',caption='A trophy disappears after a blackout.')
add('M02',3,m,10.4,[420,218,1080,608],'MYSTERY',caption='The obvious theory: theft.')
add('M03',3,m,13.4,[420,218,1080,608],'MYSTERY',caption='But the display overheated first.')
add('M04',3,m,16.1,[420,218,1080,608],'MYSTERY')
add('M05',2.5,m,20.5,[420,218,1080,608],'MYSTERY')
add('M06',2.5,m,25.1,[420,218,1080,608],'MYSTERY',caption='Then the safety order. Then the move.')
add('M07',4,m,35.1,[0,65,1100,840],'MYSTERY',caption='Putting the blackout first does not fit.')
add('M08',5,m,39,[0,65,1100,840],'MYSTERY',caption='The blackout came last.')
add('M09',3,m,44.4,[0,65,1600,660],'MYSTERY')
add('M10',6,m,47.4,[0,65,1600,660],'MYSTERY',caption='The access record contradicts the theft theory.')
add('M11',5,m,60,None,'MYSTERY',caption='An authorized safety move. Recovered at B4.')
assert sum(s['seconds'] for s in shots)==90

# C01 final A/B pages share the same capture clock: B's video starts .99 s
# earlier. Paired clips below use matching real wall-clock windows, not unrelated
# actions made to look simultaneous. The earlier scan is an explicitly edited take.
add('C01',6,a0,3,None,'COOP',command='!scan P4',caption='Team A finds the physical signal.')
add('C02',4,a,36,[20,110,850,470],'COOP',command='!share SCAN_P4')
add('C03',5,b,72,None,'COOP',command='!verify B17',caption='Team B checks the maintenance record.')
add('C04',6,b,109,[20,110,850,470],'COOP',command='!share MANUAL_B17_212',caption='Share both. Unlock the joint proof.')
add('C05',4,a,117,[20,220,830,320],'COOP',caption='Two channels. One shared conclusion.')
assert sum(s['seconds'] for s in shots)==115

add('D01',5,devdir/'development.webm',dev['marks']['rules'],None,'BUILD',caption='With Codex, we strengthened the engine, proof checks, persistence and Twitch integration.')
add('D02',5,devdir/'development.webm',dev['marks']['guard'],None,'BUILD',caption='The server accepts an answer only when the required evidence is complete.')
add('D03',5,devdir/'development.webm',dev['marks']['twitch'],None,'BUILD',caption='EventSub turns authorized Twitch messages into validated game actions.')
add('D04',6,devdir/'development.webm',dev['marks']['tests'],None,'BUILD',caption='Ten engine tests passed: Q01, M01 and co-op rules.')
add('D05',3,b,110.9,[20,220,830,320],'BUILD',caption='Verified in two owner-authorized Twitch test channels.')
assert sum(s['seconds'] for s in shots)==139
add('E01',5,a,153,None,'REVEAL',command='!solve B17')
add('E02',6,a,158,None,'ENDING',kind='close')
shots[-1]['holdTail']=True
assert sum(s['seconds'] for s in shots)==150

for shot in shots:
    # The overlay browser has a white exterior. Remove only that neutral
    # exterior, retaining the actual parchment panel and its recorded changes.
    if shot['source'] in (str(qoverlay),str(qsolve)):
        shot['whiteKey']=True

def call(args,log):
    p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True)
    log.write_text(p.stderr,encoding='utf8')
    if p.returncode:raise RuntimeError(log.name+': '+p.stderr[-1600:])

def normalize(index,s):
    destination=OUT/(s['id']+'.mp4')
    digest=hashlib.sha256(json.dumps({'s':s,'version':1},sort_keys=True).encode()).hexdigest()
    stamp=destination.with_suffix('.key')
    if stamp.exists() and destination.exists() and stamp.read_text()==digest:
        verify_clip(destination,s)
        return destination
    args=['ffmpeg','-hide_banner','-v','error','-y','-filter_complex_threads','1',
          '-ss',str(s['inPoint']),'-t',str(s['seconds']),'-i',s['source']]
    duration=s['seconds'];crop=s['crop']
    if s['kind']=='pair':
        args+=['-ss',str(s['secondIn']),'-t',str(duration),'-i',s['second']]
        # Field A and records B genuinely react to A's same share event. The
        # source epochs above align them; this is not two invented communities.
        vf=("[0:v]setpts=PTS-STARTPTS,crop=760:855:20:110,scale=940:1058:flags=lanczos[a];"
            "[1:v]setpts=PTS-STARTPTS,crop=760:855:20:110,scale=940:1058:flags=lanczos[b];"
            "[a][b]hstack=inputs=2,pad=1920:1080:20:11:color=0x100d0a,fps=30,setsar=1,format=yuv420p[out]")
    elif s['kind']=='close':
        vf=f'[0:v]setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={duration},scale=1920:1080:flags=lanczos,fps=30,setsar=1,format=yuv420p[out]'
    else:
        core='setpts=PTS-STARTPTS'
        if crop:
            x,y,w,h=crop;core+=f',crop={w}:{h}:{x}:{y}'
        if s.get('whiteKey'):
            core+=',colorkey=0xffffff:0.03:0.01'
        if s['push']:
            # A controlled camera move into genuine gameplay; it stops early
            # enough to read. The source aspect is preserved before letterbox.
            w,h=(crop[2],crop[3]) if crop else (1920,1080)
            oh=round(1920*h/w/2)*2
            core+=f",fps=30,zoompan=z='1+{s['push']}*min(on/30,1)':x='(iw-iw/zoom)*0.32':y='(ih-ih/zoom)/2':d=1:s=1920x{oh}:fps=30"
        core+=',scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos:out_color_matrix=bt709:out_range=tv'
        if s.get('whiteKey'):
            core+=',format=rgba,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x100d0a,fps=30,setsar=1'
            vf=('[0:v]'+core+'[fg];'
                f'color=c=0x100d0a:s=1920x1080:r=30:d={duration}[bg];'
                '[bg][fg]overlay=shortest=1,format=yuv420p[out]')
        else:
            core+=',pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x100d0a,fps=30,setsar=1,format=yuv420p'
            vf='[0:v]'+core+'[out]'
    (OUT/(s['id']+'.ffgraph')).write_text(vf,encoding='utf8')
    args+=['-filter_complex',vf,'-map','[out]','-an','-t',str(duration),'-frames:v',str(round(duration*30)),
           '-c:v','libx264','-crf','14','-preset','fast','-threads','2',
           '-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709',
           '-movflags','+faststart',str(destination)]
    call(args,destination.with_suffix('.log'))
    verify_clip(destination,s)
    stamp.write_text(digest)
    print(json.dumps({'prepared':s['id'],'seconds':duration}),flush=True)
    return destination

def verify_clip(path,shot):
    probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,width,height,nb_frames','-of','json',str(path)],capture_output=True,text=True,check=True)
    v=next(v for v in json.loads(probe.stdout)['streams'] if v['codec_type']=='video')
    expected=round(shot['seconds']*30)
    if int(v.get('nb_frames',0))!=expected or (v['width'],v['height'])!=(1920,1080):
        raise RuntimeError(f"{shot['id']} violates the frame contract: expected {expected}, received {v.get('nb_frames')}")

def main():
    global OUT,PUBLIC
    ap=argparse.ArgumentParser();ap.add_argument('--only',default='');ap.add_argument('--pack');ap.add_argument('--check',action='store_true');ap.add_argument('--sandbox-output');opts=ap.parse_args()
    ledger_path=ROOT/'src/trailer150/edit.generated.json'
    if opts.sandbox_output:
        sandbox=(ROOT/opts.sandbox_output).resolve()
        if not sandbox.is_relative_to((ROOT/'out').resolve()):raise ValueError('Sandbox output must stay within apps/demo-video/out')
        OUT=sandbox/'edit';PUBLIC=sandbox/'public'
        OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
        ledger_path=sandbox/'edit.generated.json'
    if opts.pack:
        apply_pack(Path(opts.pack).resolve(),materialize_art=not opts.check)
        validate_replacements()
    if opts.check:
        print(json.dumps({'shots':len(shots),'seconds':sum(s['seconds'] for s in shots),'pack':opts.pack,'valid':True}))
        return
    selected=opts.only.split(',') if opts.only else [s['id'] for s in shots]
    rendered=[normalize(i,s) for i,s in enumerate(shots) if s['id'] in selected]
    ledger={'seconds':150,'fps':30,'frames':4500,'shots':shots,'sourceManifests':[str(p/'manifest.json') for p in RAW],
      'noNewTwitchMessages':True,'simulatedGameplayUsed':any(s.get('captureType')=='frontend-replay' for s in shots),'codexConversationRecreated':False,
      'openingArtwork':{'file':'public/trailer150/gallery.jpg','type':'Original in-game gallery artwork, not a live capture','displayWidth':1320,'sourceWidth':1344},
      'endingFrameHold':{'shot':'E02','reason':'Hold the genuine resolved state under the brand ending'},
      'developmentManifest':str(devdir/'manifest.json'),
      'gaps':['No original Twitch chat-window send recording; command captions are grounded in durable EventSub receipts.',
              'No authentic Codex-session video; actual local source inspection and fresh test execution are shown instead.']}
    (ROOT/'src/trailer150').mkdir(exist_ok=True)
    ledger_path.write_text(json.dumps(ledger,indent=2),encoding='utf8')
    art=ROOT/'public/trailer150/gallery.jpg'
    if not art.exists():shutil.copyfile(ROOT/'../../apps/web/src/assets/quick-case/museum-gallery.jpg',art)
    if opts.only:return
    listing=OUT/'picture.concat.txt'
    listing.write_text(''.join("file '"+p.as_posix()+"'\n" for p in rendered))
    call(['ffmpeg','-hide_banner','-v','error','-y','-f','concat','-safe','0','-i',str(listing),
          '-map','0:v:0','-an','-c','copy','-movflags','+faststart',str(PUBLIC/'picture.mp4')],OUT/'concat.log')
    verify_clip(PUBLIC/'picture.mp4',{'id':'picture','seconds':150})
    joins=PUBLIC/'joins';joins.mkdir(exist_ok=True)
    for name,at in [('q01',49),('m01',90),('coop',115),('build',139)]:
        call(['ffmpeg','-hide_banner','-v','error','-y','-ss',str(at-1/30),'-i',str(PUBLIC/'picture.mp4'),
              '-frames:v','1','-q:v','2',str(joins/(name+'.jpg'))],OUT/('join-'+name+'.log'))
    print(json.dumps({'picture':str(PUBLIC/'picture.mp4'),'frames':4500}),flush=True)

def apply_pack(path,materialize_art=True):
    """Replace media independently of the locked story, captions and timing.

    Paths are relative to the pack, and a replaced evidence shot must state its
    capture type. A new frontend replay never inherits a live-capture claim.
    """
    pack=json.loads(path.read_text(encoding='utf-8-sig'))
    if pack.get('version')!=1:raise ValueError('Expected media pack version 1')
    known={s['id']:s for s in shots}
    allowed={'recorded-twitch','authenticated-host','frontend-replay','development'}
    fingerprints={}
    for id,override in pack.get('shots',{}).items():
        if id not in known:raise ValueError('Unknown shot '+id)
        s=known[id]
        if 'file' in override:
            file=(path.parent/override['file']).resolve()
            if not file.is_file():raise ValueError('Missing media for '+id)
            if override.get('captureType') not in allowed or not override.get('provenance'):
                raise ValueError(id+' requires captureType and provenance')
            s.update(source=str(file),captureType=override['captureType'],provenance=override['provenance'])
            if file not in fingerprints:fingerprints[file]=hashlib.sha256(file.read_bytes()).hexdigest()
            s['replacementFingerprint']=fingerprints[file]
        for key in ('inPoint','crop','whiteKey'):
            if key in override:s[key]=override[key]
        if 'secondFile' in override:
            file=(path.parent/override['secondFile']).resolve()
            if not file.is_file():raise ValueError('Missing second media for '+id)
            s['second']=str(file);s['secondIn']=override['secondIn']
    if pack.get('openingArtwork'):
        file=(path.parent/pack['openingArtwork']).resolve()
        if not file.is_file():raise ValueError('Missing opening artwork')
        if materialize_art and file!=(PUBLIC/'gallery.jpg').resolve():shutil.copyfile(file,PUBLIC/'gallery.jpg')

def validate_replacements():
    metadata={}
    for s in shots:
        if 'replacementFingerprint' not in s:continue
        source=s['source']
        if source not in metadata:
            p=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,width,height:format=duration','-of','json',source],capture_output=True,text=True,check=True)
            data=json.loads(p.stdout)
            video=next(v for v in data['streams'] if v['codec_type']=='video')
            metadata[source]=(video,float(data['format']['duration']))
        v,duration=metadata[source]
        if not math.isfinite(s['inPoint']) or s['inPoint']<0:raise ValueError(s['id']+' has an invalid in-point')
        if s['inPoint']+s['seconds']>duration+1/30 and not s.get('holdTail'):
            raise ValueError(s['id']+' needs more source footage for its locked duration')
        crop=s['crop']
        if crop:
            x,y,w,h=crop
            if min(x,y)<0 or min(w,h)<=0 or x+w>v['width'] or y+h>v['height']:
                raise ValueError(s['id']+' crop exceeds the replacement source')

if __name__=='__main__':main()
