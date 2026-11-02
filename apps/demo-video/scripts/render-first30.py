"""Export only the first 900 frames of the current native-footage revision."""
from pathlib import Path
import json
import subprocess
import textwrap

root=Path(__file__).resolve().parent.parent
out=root/'out/first30-v2'
out.mkdir(parents=True,exist_ok=True)
def run(args,log):
    result=subprocess.run(args,cwd=root,capture_output=True,text=True)
    log.write_text(result.stderr,encoding='utf-8')
    if result.returncode:
        raise RuntimeError(result.stderr[-1600:])

listing=out/'inputs.txt'
listing.write_text(''.join("file '"+(root/'public/submission'/f'{key}.mp4').as_posix()+"'\n" for key in ['S1','S2']))
run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-t','30',
     '-an','-c:v','copy',str(out/'picture.mp4')],out/'picture.log')
align=json.loads((root/'src/submission/narration-guide.generated.json').read_text())
filters=[]
for track in align:
    if track['id'] not in ['S1','S2'] or track['variant']!='default':
        continue
    for i,cue in enumerate(track['cues']):
        text=out/f"{track['id']}-{i}.txt"
        text.write_text('\n'.join(textwrap.wrap(cue['text'],95)),encoding='utf-8')
        begin=track['start']+cue['at']; end=begin+cue['duration']
        filters.append(f"drawtext=fontfile=public/fonts/Inter-variable.ttf:textfile={text.relative_to(root).as_posix()}:"
                       "expansion=none:x=(w-text_w)/2:y=h-34-text_h:fontsize=30:fontcolor=0xe9decb:line_spacing=10:"
                       f"box=1:boxcolor=0x100d0a@0.96:boxborderw=13:enable='gte(t,{begin})*lt(t,{end})'")
audio=('[1:a]aresample=48000,aformat=channel_layouts=stereo[a1];'
       '[2:a]aresample=48000,aformat=channel_layouts=stereo[a2];'
       '[a1][a2]concat=n=2:v=0:a=1,atrim=duration=30,asplit=2[vo][side];'
       '[3:a]atrim=duration=30[music];[music][side]sidechaincompress='
       'threshold=0.025:ratio=5:attack=15:release=300[bed];'
       '[vo][bed]amix=inputs=2:normalize=0:duration=first,'
       'loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=out:st=29.65:d=0.35[audio]')
destination=root/'out/Cluenite-First-30s-v2.mp4'
run(['ffmpeg','-hide_banner','-v','error','-y','-filter_complex_threads','1',
     '-i',str(out/'picture.mp4'),'-i','public/submission/narration/S1.wav',
     '-i','public/submission/narration/S2.wav','-i','public/submission/score.wav',
     '-filter_complex',audio,'-vf',','.join(filters),'-map','0:v:0','-map','[audio]',
     '-t','30','-frames:v','900','-c:v','libx264','-preset','fast','-crf','16',
     '-threads','2','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709',
     '-colorspace','bt709','-c:a','aac','-b:a','256k','-ar','48000','-ac','2',
     '-movflags','+faststart',str(destination)],out/'encode.log')
print(json.dumps({'file':str(destination),'frames':900,'fps':30,'voice':'Synthetic narration guide'}))
