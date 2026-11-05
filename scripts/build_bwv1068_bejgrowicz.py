"""Convert the supplied, unverified-against-PDF voices-v1 transcription.
Derived score CC BY-SA 3.0. Never silently fills gaps or realizes ornaments.
"""
import hashlib
import json
import re
from pathlib import Path
import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import lil_matrix

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'scripts/score-sources/bwv1068-air-bejgrowicz'
raw=DIR/'transcription.json'; data=json.loads(raw.read_text())
assert [b['n'] for b in data['bars']]==list(range(1,38))
notes=[]; pending={}; ties=[]; counts={v:0 for v in 'mib'}
for bar in data['bars']:
    for voice in 'mib':
        previous=-1
        for token in bar[voice].split():
            match=re.fullmatch(r'([\d.]+):([A-G])([#b]?)(\d)/(\d+(?:\.\d+)?)([*~]?)',token)
            assert match,(bar['n'],voice,token)
            t,letter,acc,octave,d,flag=match.groups();t=float(t);d=float(d)
            assert t>=previous and 0<=t<4 and d>0 and t+d<=4 and t*4%1==0 and d*4%1==0
            previous=t; pitch=12*(int(octave)+1)+dict(C=0,D=2,E=4,F=5,G=7,A=9,B=11)[letter]+{'':0,'#':1,'b':-1}[acc]
            assert 40<=pitch<=74
            at=(bar['n']-1)*4+t;ref=dict(bar=bar['n'],voice=voice,token=token)
            counts[voice]+=1
            key=(voice,pitch)
            if flag=='~':
                assert key in pending,(ref,'orphan tie stop')
                e=pending.pop(key);assert e['at']+e['duration']==at,(ref,'noncontiguous tie')
                e['duration']+=d;e['refs'].append(ref);ties.append(dict(start=e['refs'][0],stop=ref))
            else:
                assert key not in pending,(ref,'unclosed tie')
                e=dict(at=at,pitch=pitch,duration=d,velocity={'m':.85,'i':.70,'b':.72}[voice],refs=[ref]);notes.append(e)
                if flag=='*':pending[key]=e
assert not pending
# A unison written in multiple voices is one physical sustained pitch, not two
# independently doubled synthesized strings. Preserve all provenance and audit
# the interpretive suppression of attacks nested inside an already held unison.
unisons=[]; merged=[]
for e in sorted(notes,key=lambda n:(n['pitch'],n['at'])):
    last=merged[-1] if merged else None
    if last and last['pitch']==e['pitch'] and e['at']<last['at']+last['duration']:
        unisons.append(dict(held=last['refs'].copy(),overlap=e['refs'].copy()))
        last['duration']=max(last['at']+last['duration'],e['at']+e['duration'])-last['at']
        last['velocity']=max(last['velocity'],e['velocity']);last['refs']+=e['refs']
    else:merged.append(e.copy())
notes=sorted(merged,key=lambda n:(n['at'],-n['pitch']))
# Solve string occupancy globally rather than assigning a string independently
# for each note. Fret spread is a proxy, not verification of human fingering.
opens={1:64,2:59,3:55,4:50,5:45,6:40}
choices=[(j,s,e['pitch']-o) for j,e in enumerate(notes) for s,o in opens.items() if 0<=e['pitch']-o<=12]
by_note={j:[k for k,c in enumerate(choices) if c[0]==j] for j in range(len(notes))}
constraints=[];lo=[];hi=[]
for ix in by_note.values():constraints.append(ix);lo.append(1);hi.append(1)
active_pairs=[]
for j,e in enumerate(notes):
    for k in range(j+1,len(notes)):
        f=notes[k]
        if f['at']>=e['at']+e['duration']:break
        active_pairs.append((j,k))
        for a in by_note[j]:
            for b in by_note[k]:
                _,sa,fa=choices[a];_,sb,fb=choices[b]
                if sa==sb or (fa>0 and fb>0 and abs(fa-fb)>6):
                    constraints.append([a,b]);lo.append(0);hi.append(1)
A=lil_matrix((len(constraints),len(choices)))
for row,ix in enumerate(constraints):A[row,ix]=1
cost=np.array([f*f+.01*s for _,s,f in choices])
result=milp(cost,integrality=np.ones(len(choices)),bounds=Bounds(0,1),constraints=LinearConstraint(A.tocsr(),lo,hi),options={'time_limit':60})
assert result.success,result.message
for j in range(len(notes)):
    selected=[choices[k] for k in by_note[j] if result.x[k]>.5];assert len(selected)==1
    notes[j]['string']=selected[0][1]
for j,k in active_pairs:assert notes[j]['string']!=notes[k]['string']
order=list(range(1,13))+list(range(1,12))+[13]+list(range(14,38))*2
assert len(order)==72
events=[]; performed=[]
for occurrence,bar in enumerate(order):
    start=(bar-1)*4
    for e in notes:
        if start<=e['at']<start+4:
            # A tie crossing a bar must continue along the chosen repeat path.
            if e['at']+e['duration']>start+4:assert order[occurrence+1]==bar+1
            at=occurrence*4+e['at']-start
            events.append([at,e['pitch'],e['duration'],e['velocity'],e['string']])
            performed.append(dict(occurrence=occurrence+1,sourceBar=bar,**e,performedAt=at))
events.sort(key=lambda e:(e[0],-e[1]))
source=dict(credit='J. S. Bach; guitar arrangement Seweryn Bejgrowicz (www.sew.prv.pl), Cantorion 4244; PMG digital transcription from supplied voices-v1 data.',
    license='CC BY-SA 3.0',licenseUrl='https://creativecommons.org/licenses/by-sa/3.0/',
    url='https://cantorion.org/music/4244/Orchestral-Suite-(Overture)-No.-3-Air-on-the-G-String',
    modifications='Supplied sounding pitches retained; repeats expanded; explicit ties joined. Overlapping same-pitch voices coalesced into one sustain (audit lists suppressed inner attacks). Ornament realizations omitted; no implied ties added. Quarter=56 and voice velocities are editorial. Source PDF could not be independently inspected in this execution environment.',
    pitch='C major; standard E2 A2 D3 G3 B3 E4. Algorithmic string assignment, frets0-12 allowed, no simultaneous string collision and nonzero fret spread<=6. Finger numbers, shifts, barres and human playability unverified. Original voice tokens retained separately.',
    terms='Arrangement and derived score CC BY-SA 3.0: retain composer/arranger/source/license/change notices; share adaptations alike. No endorsement implied. Application code and existing two-voice arrangement are separate.',
    endingStatus='37 written bars; order1-12,1-11,13,14-37,14-37; 72 performed bars, 288 quarter beats; 4/4. Source gaps retained as rests; final chord ends288. No added fermata time.')
assert all(len(s)<=500 for s in source.values())
song={'air1068_bejgrowicz':dict(score=dict(title='J. S. Bach · G線上のアリア（Seweryn Bejgrowicz編）',bpm=56,meter=[4,4],endBeat=288,events=events),label='J. S. Bach · BWV 1068 — Bejgrowicz',option='G線上のアリア / Air（Bejgrowicz編・内声付き）',edition='37小節・反復あり・ハ長調・採譜データから再生',source=source)}
(ROOT/'synth-demo/bwv1068-bejgrowicz.js').write_text('// Generated by scripts/build_bwv1068_bejgrowicz.py. Derived score CC BY-SA 3.0.\nconst bwv1068Bejgrowicz = '+json.dumps(song,ensure_ascii=False,separators=(',',':')).replace('],[','],\n[')+';\n')
maxpoly=max(sum(e[0]<=t<e[0]+e[2] for e in events) for t in {e[0] for e in events})
audit=dict(sourceSha256=hashlib.sha256(raw.read_bytes()).hexdigest(),sourceTokenCounts=counts,ties=ties,unisons=unisons,order=order,writtenBars=37,performedBars=72,endBeat=288,sourceNotes=notes,performedNotes=performed,eventCount=len(events),range=[min(e[1] for e in events),max(e[1] for e in events)],maxPolyphony=maxpoly,maxFret=max(e[1]-opens[e[4]] for e in events))
(DIR/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:audit[k] for k in ['sourceTokenCounts','eventCount','range','maxPolyphony','maxFret']}));print('ties',len(ties),'coalesced unisons',len(unisons))
