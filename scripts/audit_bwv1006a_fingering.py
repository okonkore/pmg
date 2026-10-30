"""Necessary string-assignment screening, NOT human fingering verification."""
import json
from import_bwv1006a_complete import ROOT,SOURCES
TUNING=[40,45,50,55,59,64]
def screen(events,span=None):
 states={()}
 for time in sorted({a for a,p,d in events}):
  active={i for i,(a,p,d) in enumerate(events) if a<=time<a+d-1e-9}
  states={tuple((i,s) for i,s in state if i in active) for state in states}
  for i in sorted(active):
   if events[i][0]!=time:continue
   following=set()
   for state in states:
    used={s for _,s in state}
    for string,base in enumerate(TUNING):
     fret=events[i][1]-base
     if string in used or not 0<=fret<=19:continue
     candidate=tuple(sorted(state+((i,string),)))
     frets=[events[n][1]-TUNING[st] for n,st in candidate if events[n][1]!=TUNING[st]]
     if span is not None and frets and max(frets)-min(frets)>span:continue
     following.add(candidate)
   states=following
  if not states:return dict(passNecessaryCheck=False,firstFailureBeat=time,activePitches=sorted(events[i][1] for i in active))
 return dict(passNecessaryCheck=True,firstFailureBeat=None)
def audit():
 songs=json.loads((ROOT/'synth-demo/bwv1006a-complete.js').read_text().split('const bwv1006aComplete = ')[1].rstrip(';\n'))
 out={}
 for key,s in songs.items():
  e=s['score']['events'];times={a for a,p,d in e}
  out[key]=dict(maxSimultaneousNotes=max(sum(a<=t<a+d-1e-9 for a,p,d in e) for t in times),heldStringAssignment=screen(e),heldStringAssignmentSpan4=screen(e,4))
 result=dict(assumptions='Six standard strings, frets0-19; each distinct note event stays on its assigned string until its source duration ends. Unisons across voices are retained. Span4 is a conservative optional nonzero-fret spread constraint; neither test models fingers/barres/hand motion or proves a playable performance.',pieces=out)
 (SOURCES/'fingering-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(out,indent=2))
if __name__=='__main__':audit()
