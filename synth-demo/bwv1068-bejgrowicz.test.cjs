const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),M=require('./sequencer-model.js');
const dir=path.join(__dirname,'../scripts/score-sources/bwv1068-air-bejgrowicz'),raw=fs.readFileSync(path.join(dir,'transcription.json')),input=JSON.parse(raw),audit=JSON.parse(fs.readFileSync(path.join(dir,'audit.json'))),scope=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'bwv1068-bejgrowicz.js'),'utf8'),scope);
const song=JSON.parse(vm.runInContext('JSON.stringify(bwv1068Bejgrowicz.air1068_bejgrowicz)',scope)),d=M.fromSong('air1068_bejgrowicz',song);
assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),audit.sourceSha256);
assert.equal(input.bars.length,37);assert.equal(d.endBeat,288);assert.equal(d.bpm,56);assert.deepEqual([...d.meter],[4,4]);assert.equal(d.notes.length,903);
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
assert.deepEqual(audit.order,[...range(1,12),...range(1,11),13,...range(14,37),...range(14,37)]);
assert.deepEqual(audit.sourceTokenCounts,{m:161,i:169,b:146});assert.equal(audit.ties.length,15);assert.equal(audit.unisons.length,3);
// Independent supplied-data anchors and rests, not generated audit assertions.
const has=(beat,pitch,duration)=>d.notes.some(n=>n.beat===beat&&n.pitch===pitch&&n.duration===duration);
assert(has(0,64,4));assert(has(4,64,4));assert(has(9,69,.5));assert(has(37.5,64,1));
assert(has(48,64,4));assert(has(92,55,4));assert(has(96,59,2.5));assert(has(192,59,2.5));
assert(has(115,62,1.5)); // bar18 -> bar19 tie in first B section
assert(has(211,62,1.5));
assert(!d.notes.some(n=>n.beat===116&&n.pitch===62),'No reattack at tie continuation');
assert(!d.notes.some(n=>n.beat===20&&n.pitch>=59),'bar6 melody begins at half beat');
assert.deepEqual(d.notes.filter(n=>n.beat===284).map(n=>n.pitch).sort((a,b)=>a-b),[48,52,55,60]);
assert(d.notes.filter(n=>n.beat===284).every(n=>n.duration===4));
assert(!d.notes.some(n=>n.beat===19&&n.pitch===67),'bar5 overlapping inner G4 coalesced');
assert(has(137,55,2)); // bar24 simultaneous G3 union
const opens=[0,64,59,55,50,45,40];let maximum=0,span=0;
for(const n of d.notes){assert(n.pitch>=40&&n.pitch<=70);assert(n.duration>0);assert.equal(n.beat*4%1,0);assert.equal(n.duration*4%1,0);assert(n.pitch-opens[n.stringNumber]>=0&&n.pitch-opens[n.stringNumber]<=8);assert(n.beat+n.duration<=288);}
for(const t of new Set(d.notes.map(n=>n.beat))){const active=d.notes.filter(n=>n.beat<=t&&t<n.beat+n.duration);maximum=Math.max(maximum,active.length);assert.equal(new Set(active.map(n=>n.stringNumber)).size,active.length);assert.equal(new Set(active.map(n=>n.pitch)).size,active.length);const f=active.map(n=>n.pitch-opens[n.stringNumber]).filter(x=>x>0);if(f.length)span=Math.max(span,Math.max(...f)-Math.min(...f));}
assert.equal(maximum,5);assert.equal(span,6);
assert.equal(d.source.license,'CC BY-SA 3.0');assert.match(d.source.credit,/Seweryn Bejgrowicz/);assert.match(d.source.modifications,/could not be independently inspected/);assert.match(d.source.modifications,/Ornament/);
const round=M.fromSong('air1068_bejgrowicz',M.toSong(d));assert.deepEqual(round.source,d.source);assert.deepEqual(round.notes.map(({id,...n})=>n),d.notes.map(({id,...n})=>n));
console.log('PASS Bejgrowicz: supplied-data anchors, 37 written/72 performed bars, 903 events, 15 ties, 3 unisons, E2-Bb4, explicit strings, max5 notes; span6/human fingering and PDF fidelity unverified.');
