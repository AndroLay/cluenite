"""Edit the owner-approved, real Cluenite recordings into the 175-second film.

Reference footage is never an input. All holds, crops and time compression are
editorial; no browser state, participant, provider receipt or reaction is invented.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import textwrap

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'out/submission-edit-v2'
PUBLIC = ROOT / 'public/submission'
OUT.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)
FONT = 'public/fonts/Inter-variable.ttf'
DISPLAY = 'public/fonts/EBGaramond-variable.ttf'
MONO = '../../../../../../Windows/Fonts/consola.ttf'
INK, PAPER, GOLD = '0x100d0a', '0xe9decb', '0xd9b681'
RAW = [
    ROOT / 'out/live-capture-2026-11-02T15-44-56-890Z',
    ROOT / 'out/live-capture-2026-11-02T16-17-38-150Z',
    ROOT / 'out/live-capture-2026-11-02T16-34-01-658Z',
    ROOT / 'out/live-capture-2026-11-02T16-40-29-628Z',
]
MANIFESTS = [json.loads((p / 'manifest.json').read_text()) for p in RAW]
assert all(m.get('originalRuntimeRestored') and m.get('originalRoundsUnchanged') for m in MANIFESTS)
assert MANIFESTS[-1]['ok'] and MANIFESTS[-1]['acceptedMessages'] == 13
assert all(m['pageErrors'] == [] for m in MANIFESTS)
assert [m['command'] for m in MANIFESTS[3]['messages']] == [
    '!share SCAN_P4', '!verify B17', '!share MANUAL_B17_212', '!solve B17'
]
assert all(m['eventSubReceipt'] for source in MANIFESTS for m in source['messages'])

shutil.copyfile(ROOT / '../../apps/web/src/assets/quick-case/museum-gallery.jpg', PUBLIC / 'gallery.jpg')
proof = json.loads((ROOT / 'src/submission/proof.generated.json').read_text())
alignment = json.loads((ROOT / 'src/submission/narration-guide.generated.json').read_text())
assert len({a['id'] for a in alignment}) == 8

def run(args, log):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    log.write_text(result.stderr, encoding='utf-8')
    if result.returncode:
        raise RuntimeError(f'{log.name}: {result.stderr[-1800:]}')

def rel(path):
    return Path(path).relative_to(ROOT).as_posix()

def text_filter(key, value, x='(w-text_w)/2', y=80, size=30, font=FONT,
                color=PAPER, extra=''):
    path = OUT / (key + '.txt')
    path.write_text(value, encoding='utf-8')
    return (f"drawtext=fontfile={font}:textfile={rel(path)}:expansion=none:"
            f"x={x}:y={y}:fontsize={size}:fontcolor={color}:line_spacing=10"
            + (':' + extra if extra else ''))

shots = []
def shot(segment, name, seconds, source=None, start=0, take=None, crop=None,
         mode='native', title='', command='', label='', page=''):
    shots.append(dict(segment=segment, name=name, seconds=seconds,
                      source=str(source) if source else None, start=start,
                      take=take or seconds, crop=crop, mode=mode, title=title,
                      command=command, label=label, page=page))

q0, q1, m0, c0 = RAW
qfirst = q0 / 'q01-overlay.webm'
qreveal = q1 / 'q01-overlay.webm'
qhost = q0 / 'q01-host.webm'
mystery = m0 / 'm01.webm'
field, records = c0 / 'coop-A.webm', c0 / 'coop-B.webm'

shot('S1','opening',12,qfirst,1.4,mode='opening',label='Actual Twitch test · local OBS overlay')
shot('S2','chat-to-clue',9,qfirst,13.81,mode='overlay',command='!look CAM',label='Quick Case · actual Twitch input')
shot('S2','camera-record',8,qhost,23,crop=[1034,684,774,354],title='Tag R-07. A low, fast object.',label='Q01 · native camera observation')
shot('S2','overlay-context',6,qfirst,24,mode='overlay',title='One observation. A new lead.',label='Actual Twitch response · edited recording')
shot('S3','schedule-and-link',8.5,qfirst,36.4,mode='overlay',command='!look SCHEDULE   →   !link CAM_R07 SCHEDULE_R07',label='Actual Twitch inputs · schedule and connection')
shot('S3','earned-answer',8.5,qreveal,.8,mode='overlay',command='!solve ROBOT',label='Actual Twitch verdict · server-verified result')
shot('S4','museum-context',4,mystery,1.5,label='Mystery Live · recorded host playthrough')
shot('S4','evidence-board',4,mystery,30,take=3.8,label='M01 · authenticated server state')
shot('S4','heat-warning',4,mystery,12.5,take=1.7,crop=[630,255,660,570],title='18:56 · before the blackout',label='Native clue inspection · host controls')
shot('S4','access-record',4,mystery,17.1,take=1.7,crop=[630,255,660,570],title='18:58 · the case was opened',label='Native clue inspection · host controls')
shot('S4','trolley-record',4,mystery,21.8,take=1.7,crop=[630,255,660,570],title='18:59 · a trolley leaves',label='Native clue inspection · host controls')
shot('S4','signed-order',4,mystery,26.4,take=1.7,crop=[630,255,660,570],title='The move was authorized.',label='Native clue inspection · host controls')
shot('S4','blackout-question',4,mystery,2,title='',label='What happened before the lights went out?')
shot('S5','wrong-order',5,mystery,35.9,take=2.7,crop=[0,65,1100,840],label='M01 · actual rejected host action')
shot('S5','correct-order',7,mystery,39,take=5.1,crop=[0,65,1100,840],label='Actual reordering and accepted timeline')
shot('S5','plausible-theory',3.5,mystery,44.5,take=2.3,crop=[0,65,1600,660],label='An unverified theory')
shot('S5','contradiction',6,mystery,47.4,take=4.1,crop=[0,65,1600,660],label='Actual ACCESS_RECORD challenge · server response')
shot('S5','museum-verdict',3.5,mystery,54.2,take=3.5,label='Actual host verdict · proof complete')
shot('S6','field-context',3,m0/'coop-A.webm',.3,label='Co-op · field station · owner-controlled channel A')
shot('S6','field-scan',4,field,3,crop=[20,110,850,470],command='!scan P4',label='Actual Twitch scan · field finding')
shot('S6','records-verify',5,records,72.8,crop=None,command='!verify B17',label='Co-op · records station · owner-controlled channel B')
shot('S6','field-share',4,field,36.4,crop=[20,110,850,470],command='!share SCAN_P4',label='Actual Twitch share · field station')
shot('S6','records-share',7,records,109.5,crop=[20,110,850,470],command='!share MANUAL_B17_212',label='Actual Twitch share · joint proof appears')
shot('S6','joint-proof',5,field,116.5,crop=[20,220,830,320],title='Each side completes the other.',label='Actual joint proof · both channels contributed')
shot('S6','coop-verdict',4,field,152.8,command='!solve B17',label='Actual Twitch verdict · co-op solved')
shot('S7','build-rules',6,qfirst,43.5,mode='build-rules',label='Actual repository excerpts · built with OpenAI Codex')
shot('S7','build-path',7,mode='build-path',label='Implemented architecture · explanatory graphic')
shot('S7','build-tests',5,mode='build-tests',label='Actual local engine test run · 2 November 2026')
shot('S7','build-result',5,qreveal,12,mode='overlay',title='The server verifies. The overlay reveals.',label='Actual Twitch-to-overlay result')
shot('S8','return-to-answer',6,qreveal,17,mode='overlay',label='The Gallery Shadow · verified answer')
shot('S8','close',9,mode='close')

assert sum(s['seconds'] for s in shots) == 175
durations = dict(S1=12,S2=23,S3=17,S4=28,S5=25,S6=32,S7=23,S8=15)
assert all(sum(s['seconds'] for s in shots if s['segment']==key)==duration for key,duration in durations.items())

def render_shot(s):
    dest = OUT / (s['name'] + '.mp4')
    key = hashlib.sha256(json.dumps({'shot':s,'version':3,'proof':proof['tests']},sort_keys=True).encode()).hexdigest()
    stamp = dest.with_suffix('.key')
    if dest.exists() and stamp.exists() and stamp.read_text() == key:
        return dest
    args = ['ffmpeg','-hide_banner','-v','error','-y','-filter_complex_threads','1']
    graph = []
    duration, mode = s['seconds'], s['mode']
    if mode in ('overlay','opening','build-rules'):
        args += ['-loop','1','-framerate','30','-i','public/submission/gallery.jpg',
                 '-ss',str(s['start']),'-t',str(s['take']),'-i',s['source']]
        graph += ["[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,eq=brightness=-0.24:saturation=0.85[bg]",
                  "[1:v]setpts=PTS-STARTPTS,crop=540:436:24:620,colorkey=0xffffff:0.04:0.01,scale=1026:828:flags=lanczos,tpad=stop_mode=clone:stop_duration=20[ui]",
                  "[bg][ui]overlay=447:90:shortest=1[base]"]
    elif mode == 'native':
        args += ['-ss',str(s['start']),'-t',str(s['take']),'-i',s['source']]
        if s['crop']:
            x,y,w,h=s['crop']
            vf=(f'crop={w}:{h}:{x}:{y},scale=1720:810:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,'
                f'pad=1920:1080:(ow-iw)/2:135:color={INK}')
        else:
            vf='scale=1920:1080:flags=lanczos'
        graph += [f'[0:v]setpts=PTS-STARTPTS,{vf},tpad=stop_mode=clone:stop_duration=20[base]']
    else:
        args += ['-f','lavfi','-i',f'color=c={INK}:s=1920x1080:r=30:d={duration}']
        graph += ['[0:v]null[base]']

    vf=[]
    name=s['name']
    if mode=='opening':
        vf += [
            text_filter(name+'-question','What triggered the alarm?',y=155,size=74,font=DISPLAY,extra="enable='lt(t,3.7)'"),
            text_filter(name+'-brand','Cluenite',y=140,size=105,font=DISPLAY,extra="alpha='min(1,max(0,(t-3.7)/0.5))'"),
            text_filter(name+'-definition','A Twitch-native mystery game',y=270,size=32,extra="alpha='min(1,max(0,(t-4.1)/0.5))'")
        ]
    elif mode=='build-rules':
        vf += [f'drawbox=x=0:y=0:w=1920:h=520:color={INK}@0.97:t=fill',
               text_filter(name+'-heading','Built with OpenAI Codex',y=95,size=66,font=DISPLAY),
               text_filter(name+'-principle','Define the evidence before accepting an answer.',y=198,size=30),
               text_filter(name+'-source','packages/cases/src/q01GalleryShadow.ts · lines 51 and 60',y=292,size=21,color=GOLD),
               text_filter(name+'-code','connections: [{ a: "CAM_R07", b: "SCHEDULE_R07" }],\nacceptedVerdicts: ["ROBOT"],',x=260,y=350,size=30,font=MONO)]
    elif mode=='build-path':
        vf += [text_filter(name+'-title','Connect the pieces.',y=95,size=74,font=DISPLAY),
               text_filter(name+'-line','Codex helped implement the engine, EventSub, persistence and realtime updates.',y=205,size=27)]
        for i,(title,detail) in enumerate([
            ('Twitch chat','Viewer command'),('EventSub','Validated origin'),
            ('Case engine','PostgreSQL state'),('OBS overlay','Realtime result')]):
            x=100+i*450
            vf += [f'drawbox=x={x}:y=390:w=370:h=180:color=0x211811:t=fill',
                   f'drawbox=x={x}:y=390:w=370:h=180:color=0xa77a48@0.65:t=2',
                   text_filter(name+f'-node{i}',title,x=x+28,y=422,size=43,font=DISPLAY),
                   text_filter(name+f'-detail{i}',detail,x=x+28,y=500,size=22,color=GOLD)]
            if i<3:
                vf += [text_filter(name+f'-arrow{i}','→',x=x+393,y=450,size=37)]
        vf += [text_filter(name+'-paths','apps/server/src/twitch/chatEnvelope.ts    ·    packages/engine/src/round.ts',y=684,size=23,color=GOLD)]
    elif mode=='build-tests':
        vf += [text_filter(name+'-title','Check what can go wrong.',x=100,y=95,size=66,font=DISPLAY),
               text_filter(name+'-path','packages/engine/src/round.ts · actual missing-proof guard',x=100,y=230,size=21,color=GOLD),
               text_filter(name+'-guard',proof['engine']['code'].split('  const next:')[0].strip(),x=100,y=300,size=28,font=MONO),
               text_filter(name+'-count',f"{proof['tests']['passed']} / {proof['tests']['total']}",x=1260,y=280,size=150,font=DISPLAY,color=GOLD),
               text_filter(name+'-passed','Engine tests passed',x=1260,y=470,size=33),
               text_filter(name+'-scope','Q01 · proof before verdict\nM01 · sequence and contradiction\nC01 · complementary station proof',x=1220,y=550,size=24,color=GOLD)]
    elif mode=='close':
        vf += [text_filter(name+'-wordmark','Cluenite',y=250,size=152,font=DISPLAY),
               text_filter(name+'-promise','Built for streamers.\nSolved together.',y=470,size=42),
               text_filter(name+'-event','Built with OpenAI Codex · Codex x TwitchCon',y=690,size=24,color=GOLD),
               'fade=t=out:st=8.1:d=0.9']
    if s['title']:
        vf += [text_filter(name+'-title',s['title'],y=58,size=46,font=DISPLAY)]
    if s['command']:
        vf += [text_filter(name+'-command',s['command'],y=846,size=29,font=MONO,color=GOLD,
                           extra=f'box=1:boxcolor={INK}@0.95:boxborderw=12')]
    if s['label']:
        vf += [text_filter(name+'-label',s['label'],x=72,y=26,size=19,color=GOLD,
                           extra=f'box=1:boxcolor={INK}@0.94:boxborderw=9')]
    graph += ['[base]'+(','.join(vf) if vf else 'null')+',fps=30,setsar=1,format=yuv420p[out]']
    script=OUT/(name+'.ffgraph')
    script.write_text(';\n'.join(graph),encoding='utf-8')
    args += ['-filter_complex',';\n'.join(graph),'-map','[out]','-an','-t',str(duration),
             '-frames:v',str(round(duration*30)),'-c:v','libx264','-preset','fast',
             '-crf','17','-threads','2','-color_primaries','bt709','-color_trc','bt709',
             '-colorspace','bt709','-movflags','+faststart',str(dest)]
    run(args,dest.with_suffix('.log'))
    stamp.write_text(key)
    print(json.dumps({'rendered':name,'seconds':duration}),flush=True)
    return dest

def concatenate(files,destination):
    listing=destination.with_suffix('.concat.txt')
    listing.write_text(''.join("file '"+p.as_posix().replace("'","'\\''")+"'\n" for p in files))
    run(['ffmpeg','-hide_banner','-v','error','-y','-f','concat','-safe','0','-i',str(listing),
         '-map','0:v:0','-an','-c','copy','-movflags','+faststart',str(destination)],
        destination.with_suffix('.log'))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--segments',default='')
    options=parser.parse_args()
    chosen=options.segments.split(',') if options.segments else list(durations)
    for segment in chosen:
        rendered=[render_shot(s) for s in shots if s['segment']==segment]
        concatenate(rendered,PUBLIC/(segment+'.mp4'))
    (OUT/'edit-plan.json').write_text(json.dumps({
        'duration':175,'fps':30,'shots':shots,'referenceMediaUsed':False,
        'truth':'Edited genuine captures with reading holds; M01 uses recorded authenticated host actions.',
        'acceptedTwitchMessages':13,'originalRoundsUnchanged':True,
        'sourceManifests':[rel(p/'manifest.json') for p in RAW],
    },indent=2),encoding='utf-8')
    if options.segments:
        return
    concatenate([PUBLIC/(key+'.mp4') for key in durations],OUT/'picture-175.mp4')
    voices=[PUBLIC/'narration'/(key+('-coop' if key=='S6' else '')+'.wav') for key in durations]
    audio=['ffmpeg','-hide_banner','-v','error','-y']
    for voice in voices:
        audio += ['-i',str(voice)]
    audio += ['-filter_complex',
              ''.join(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo[a{i}];' for i in range(8))+
              ''.join(f'[a{i}]' for i in range(8))+'concat=n=8:v=0:a=1,atrim=duration=175[voice]',
              '-map','[voice]','-c:a','pcm_s16le',str(OUT/'voice-175.wav')]
    run(audio,OUT/'voice-concat.log')
    caption_filters=[]
    for a in alignment:
        if (a['id']=='S6' and a['variant']!='coop') or (a['id']!='S6' and a['variant']!='default'):
            continue
        for i,cue in enumerate(a['cues']):
            begin=a['start']+cue['at']; end=begin+cue['duration']
            caption_filters.append(text_filter(
                a['id']+f'-caption{i}','\n'.join(textwrap.wrap(cue['text'],95)),
                y='h-34-text_h',size=30,
                extra=f"box=1:boxcolor={INK}@0.96:boxborderw=13:enable='gte(t,{begin})*lt(t,{end})'"))
    (OUT/'captions.ffgraph').write_text(',\n'.join(caption_filters),encoding='utf-8')
    final=ROOT/'out/Cluenite-Submission-2m55-v2.mp4'
    score=PUBLIC/'score.wav'
    if not score.exists():
        raise RuntimeError('Run scripts/compose-submission-score.py first.')
    # Original score ducks underneath the editable synthetic narration.
    mixing=('[1:a]asplit=2[vo][side];[2:a][side]sidechaincompress='
            'threshold=0.025:ratio=5:attack=15:release=300[bed];'
            '[vo][bed]amix=inputs=2:duration=first:normalize=0,'
            'alimiter=limit=0.89,aresample=48000[mix]')
    mixing=mixing.replace('[1:a]','[0:a]').replace('[2:a]','[1:a]')
    run(['ffmpeg','-hide_banner','-v','error','-y','-i',str(OUT/'voice-175.wav'),'-i',str(score),
         '-filter_complex',mixing,'-map','[mix]','-t','175','-ar','48000','-c:a','pcm_s16le',
         str(OUT/'mix-175.wav')],OUT/'mix.log')
    meter=subprocess.run(['ffmpeg','-hide_banner','-i',str(OUT/'mix-175.wav'),
                          '-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-'],
                         capture_output=True,text=True,check=True)
    stats,_=json.JSONDecoder().raw_decode(meter.stderr[meter.stderr.rfind('{'):])
    (OUT/'mix-measurements.json').write_text(json.dumps(stats,indent=2))
    norm=('loudnorm=I=-16:TP=-1.5:LRA=9:linear=true:'
          f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
          f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}")
    run(['ffmpeg','-hide_banner','-v','error','-y',
         '-i',str(OUT/'picture-175.mp4'),'-i',str(OUT/'mix-175.wav'),
         '-vf',','.join(caption_filters),'-af',norm,'-map','0:v:0','-map','1:a:0',
         '-t','175','-frames:v','5250','-c:v','libx264','-crf','16','-preset','fast',
         '-threads','2','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709',
         '-colorspace','bt709','-c:a','aac','-b:a','256k','-ar','48000','-ac','2',
         '-force_key_frames','0,12,35,52,80,105,137,160','-movflags','+faststart',str(final)],
        OUT/'final-encode.log')
    shutil.copyfile(final,PUBLIC/final.name)
    print(json.dumps({'output':str(final),'duration':175,'frames':5250,
                      'voice':'Kokoro bm_george, synthetic narration','review':'Technical and artistic review pending'}),flush=True)

if __name__=='__main__':
    main()
