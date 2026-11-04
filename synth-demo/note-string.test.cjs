const assert=require('node:assert/strict'),M=require('./sequencer-model.js'),TAB=require('./tab-model.js');
const doc={id:'fixture',title:'E4',bpm:120,meter:[4,4],notes:[{id:'n',pitch:64,beat:0,duration:1,velocity:.8}]};
assert.deepEqual(M.guitarPositions(64).slice(0,3),[{stringNumber:1,fret:0},{stringNumber:2,fret:5},{stringNumber:3,fret:9}]);
const h=new M.History(doc);h.edit(d=>d.notes[0].stringNumber=2);assert.equal(h.current.notes[0].pitch,64);h.undo();assert.equal(h.current.notes[0].stringNumber,undefined);h.redo();assert.equal(h.current.notes[0].stringNumber,2);
assert.throws(()=>h.edit(d=>d.notes[0].pitch=58),/指定弦/);assert.equal(h.current.notes[0].pitch,64);assert.throws(()=>h.edit(d=>d.notes[0].stringNumber=0),/指定弦/);
for(const invalid of [null,1.5,7,'2',NaN])assert.throws(()=>M.normalize({...doc,notes:[{...doc.notes[0],stringNumber:invalid}]}));
const state={},storage={getItem:k=>state[k]||null,setItem:(k,v)=>state[k]=v},songs={fixture:M.toSong(h.current)},lib=new M.Library(songs,storage),copy=lib.duplicate('fixture'),imported=lib.import(lib.export(copy));
assert.equal(copy.notes[0].stringNumber,2);assert.equal(imported.notes[0].stringNumber,2);assert.equal(new M.Library(songs,storage).get(imported.id).notes[0].stringNumber,2);
assert.equal(M.fromSong('x',M.toSong(copy)).notes[0].stringNumber,2);assert.equal(M.playbackEvents(M.toSong(copy).score.events,120,{enabled:true})[0][4],2);
const tab=TAB.plan(copy);assert.equal(tab.entries[0].string,2);assert.equal(tab.entries[0].fret,5);assert.equal(tab.automatic,false);
const overlap={...copy,notes:[copy.notes[0],{...copy.notes[0],id:'other'}]};assert.equal(TAB.plan(overlap).unassigned.length,1,'manual conflict must not silently move to another string');
const drop={requiredTuning:{instrument:'guitar',pitchesLowToHigh:[38,45,50,55,59,64],automaticallyApplied:false}};
assert.throws(()=>M.normalize({...doc,source:drop,notes:[{...doc.notes[0],pitch:40,stringNumber:6}]}),/調弦/);assert.equal(M.normalize({...doc,source:drop}).notes[0].stringNumber,undefined);
assert.equal(M.normalize(doc).notes[0].stringNumber,undefined);
console.log('PASS: fixed pitch choices, invalid/pitch/tuning validation, Undo, copy, persistence, JSON/events, TAB constraints, legacy Auto');

for(let sn=1;sn<=6;sn++){
 const pitch=[64,59,55,50,45,40][sn-1]+20;
 const d=M.normalize({...doc,notes:[{...doc.notes[0],pitch,stringNumber:sn}]});
 assert.equal(TAB.plan(d).entries[0].fret,20);
 assert.equal(M.fromSong('roundtrip',M.toSong(d)).notes[0].stringNumber,sn);
 assert.throws(()=>M.normalize({...d,notes:[{...d.notes[0],pitch:pitch+1}]}));
}
