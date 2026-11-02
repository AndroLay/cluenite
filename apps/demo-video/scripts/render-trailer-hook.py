from pathlib import Path
import subprocess
root=Path(__file__).resolve().parent.parent
work=root/'out/trailer150-edit'
(work/'hook-question.txt').write_text('WHO TRIGGERED THE ALARM?',encoding='utf8')
(work/'hook-stakes.txt').write_text('21:10. The gallery door stayed locked.',encoding='utf8')
(work/'hook.concat.txt').write_text(''.join("file '"+(work/(p+'.mp4')).as_posix()+"'\n" for p in ['H01','H02']))
vf="drawtext=fontfile=public/fonts/EBGaramond-variable.ttf:textfile=out/trailer150-edit/hook-question.txt:expansion=none:x=110:y=47:fontsize=64:fontcolor=0xe9decb:alpha='min(1,max(0,(t-0.6)/0.3))',drawtext=fontfile=public/fonts/Inter-variable.ttf:textfile=out/trailer150-edit/hook-stakes.txt:expansion=none:x=110:y=990:fontsize=29:fontcolor=0xd9b681"
cmd=['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(work/'hook.concat.txt'),'-i','public/submission/native-opening/score-and-foley.wav','-map','0:v:0','-map','1:a:0','-vf',vf,'-af','volume=11.69dB,afade=t=out:st=7.6:d=0.4','-t','8','-frames:v','240','-c:v','libx264','-crf','16','-preset','fast','-threads','2','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart','out/Cluenite-Trailer150-Opening-8s-v2.mp4']
p=subprocess.run(cmd,cwd=root,capture_output=True,text=True)
(work/'hook-preview-v2.log').write_text(p.stderr,encoding='utf8')
if p.returncode:raise SystemExit(p.stderr[-1500:])
print('8-second hook preview prepared.')
