"""Create/edit a frontend replacement pack without touching the film source."""
from pathlib import Path
import json,argparse,os

ROOT=Path(__file__).resolve().parent.parent
ap=argparse.ArgumentParser()
ap.add_argument('pack',type=Path)
ap.add_argument('--init',action='store_true')
ap.add_argument('--take',choices=['q01-host','q01-overlay','q01-solve','m01','coop-scan','coop-A','coop-B','development'])
ap.add_argument('--file',type=Path)
ap.add_argument('--offset',type=float,default=0)
ap.add_argument('--capture-type',choices=['recorded-twitch','authenticated-host','frontend-replay','development'])
ap.add_argument('--provenance')
opts=ap.parse_args();target=opts.pack.resolve()
edit=json.loads((ROOT/'src/trailer150/edit.generated.json').read_text())
groups={'q01-host':['H01','H02','Q01','Q03','Q04','Q06','B02'],
 'q01-overlay':['Q02','Q05','B01'],'q01-solve':['B03'],
 'm01':[f'M{i:02}' for i in range(1,12)],'coop-scan':['C01'],
 'coop-A':['C02','C05','E01','E02'],'coop-B':['C03','C04','D05'],
 'development':['D01','D02','D03','D04']}
if opts.init:
    if target.exists():raise ValueError('Preserve existing pack; use a new path')
    pack={'version':1,'description':'Only listed slots override the verified source edit. Story/timing/audio remain locked.','shots':{}}
else:
    pack=json.loads(target.read_text(encoding='utf-8-sig'))
if opts.take:
    if not opts.file or not opts.capture_type or not opts.provenance:
        raise ValueError('A replacement requires --file, --capture-type and --provenance')
    source=opts.file.resolve()
    if not source.is_file():raise ValueError('Replacement media is missing')
    ids=set(groups[opts.take])
    for shot in edit['shots']:
        if shot['id'] not in ids:continue
        pack['shots'][shot['id']]={
            'file':os.path.relpath(source,target.parent).replace('\\','/'),
            'inPoint':round(shot['inPoint']+opts.offset,3),'crop':shot['crop'],
            'captureType':opts.capture_type,'provenance':opts.provenance}
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(json.dumps(pack,indent=2),encoding='utf8')
print(json.dumps({'pack':str(target),'overriddenShots':len(pack['shots'])}))
