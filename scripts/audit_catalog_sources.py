"""Independent source recompile audit. Reports differences; does not replace any score.
Uses a temporary directory, with the official convert-ly next to --lilypond.
"""
import sys,json,subprocess,re,argparse,tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'scripts'))
from import_bwv1012 import read_notes
from test_repertoire_batch2 import track_ends
parser=argparse.ArgumentParser();parser.add_argument('--lilypond',required=True);args=parser.parse_args()
folder=tempfile.TemporaryDirectory();out=Path(folder.name)
node=r"""const fs=require('fs'),vm=require('vm'),scope=vm.createContext({});for(const f of ['gavotte','prelude','bach-solos','bach-1012','sor-op60','sor-op6','repertoire-batch1','repertoire-batch2','repertoire-batch3','repertoire-batch4','catalog-quality','repertoire-batch5','repertoire-batch6'])vm.runInContext(fs.readFileSync('synth-demo/'+f+'.js','utf8'),scope);const e=()=>({children:[],append(c){this.children.push(c)}});const elements=new Map();scope.document={getElementById(id){if(!elements.has(id))elements.set(id,e());return elements.get(id)},createElement:e};const h=fs.readFileSync('synth-demo/index.html','utf8'),s=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];vm.runInContext(s.slice(0,s.indexOf('const presets=')),scope);console.log(vm.runInContext('JSON.stringify(songs)',scope));"""
songs=json.loads(subprocess.check_output(['node','-e',node],cwd=root,text=True));jobs=[]
for p in (root/'scripts/score-sources/catalog-audit').glob('*.ly'):jobs.append((p.stem,p,0))
for n in [1,2,3,4,5,12]:jobs.append((f'sor60_{n}',root/f'scripts/score-sources/sor-op60/sor_op60-{n:02d}.ly',-12 if n<3 else 0))
p=next((root/'scripts/score-sources/sor-op6').glob('*.ly'));jobs.append(('sor6_8',p,0))
results=[]
for key,p,shift in jobs:
 text=p.read_text()
 if key in ['prelude','allemande','courante','sarabande','gigue']:
  variable=key
  text='\\version "2.24.4"\n'+text+'\n\\score { { \\transpose c c, { \\'+variable+' } } \\midi {} }\n'
 tmp=out/(key+'.ly');tmp.write_text(text)
 r=subprocess.run([str(Path(args.lilypond).with_name('convert-ly')),str(tmp)],capture_output=True,text=True);tmp.write_text(r.stdout)
 r=subprocess.run([args.lilypond,'-dno-print-pages','-dbackend=null','-o',str(out/key),str(tmp)],capture_output=True,text=True)
 (out/(key+'.log')).write_text(r.stderr)
 result={'key':key,'compiled':r.returncode==0,'warnings':[l for l in r.stderr.splitlines() if 'warning:' in l]}
 if r.returncode==0:
  data=(out/(key+'.midi')).read_bytes();events=[[a,p+shift,d] for a,p,d in read_notes(data)]
  result.update(eventsEqual=events==sorted(songs[key]['score']['events']),count=len(events),end=max(track_ends(data)),noteEnd=max(a+d for a,p,d in events))
 results.append(result)
print(json.dumps(results,indent=2))
