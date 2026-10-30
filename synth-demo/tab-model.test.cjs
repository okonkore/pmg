const assert=require('node:assert/strict'),{plan}=require('./tab-model.js');
const doc=notes=>({title:'Original fixture',bpm:120,meter:[4,4],notes:notes.map((n,i)=>({id:String(i),beat:n[0],pitch:n[1],duration:n[2],velocity:1}))});
function validate(d){const original=JSON.stringify(d),p=plan(d);assert.equal(JSON.stringify(d),original);assert.equal(p.entries.length,d.notes.length);for(const n of p.entries){if(!n.string)continue;assert.equal(n.pitch,p.tuning[6-n.string]+n.fret);for(const m of p.entries)if(n!==m&&m.string===n.string)assert(n.beat+n.duration<=m.beat+1e-9||m.beat+m.duration<=n.beat+1e-9,'No overlapping notes on a string')}return p}
let p=validate(doc([[0,40,4],[0,47,4],[0,52,4],[0,56,4],[0,59,4],[0,64,4]]));assert.equal(p.unassigned.length,0);
p=validate(doc(Array.from({length:7},(_,i)=>[0,60+i,1])));assert(p.unassigned.length>=1);
p=validate(doc([[0,40,4],[1,41,1],[2,21,1],[3,108,1]]));assert.equal(p.unassigned.length,3);
p=validate(doc([[.5,64,6],[1/3,60,1/3],[8,67,1]]));assert.equal(p.entries.find(n=>n.pitch===60).beat,1/3);assert(p.bars[1].notes.some(n=>n.pitch===64));assert(p.bars[0].rests.some(r=>r[0]===0));
p=validate({...doc([[0,41,1]]),source:{requiredTuning:{instrument:'guitar',pitchesLowToHigh:[41,45,50,55,59,64],automaticallyApplied:false}}});assert.equal(p.entries[0].string,6);assert.equal(p.entries[0].fret,0);
p=validate(doc(Array.from({length:1000},(_,i)=>[i/4,60+i%12,.2])));assert.equal(p.entries.length,1000);assert(p.bars.length>60);
assert.throws(()=>plan({...doc([]),endBeat:4096}),/512/);
const midi=require('./midi-import.js'),fixture=require('./midi-import.test.cjs').fixture;assert.equal(validate(midi.documentFrom(midi.parse(fixture),[1],'Imported original fixture')).entries.length,3);
console.log('PASS TAB: all notes retained, collision-free holds/chords, range/overfull warnings, exact fractional times, cross-bar holds/rests, required tuning, long score, explicit output limit, source immutability.');
