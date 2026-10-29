'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const scope=vm.createContext({});
for(const file of ['gavotte.js','prelude.js','bach-solos.js','bach-1012.js','sor-op60.js','sor-op6.js','repertoire-batch1.js','repertoire-batch2.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),scope,{filename:file});
}
const elements=new Map();
function element(tag){return {tag,children:[],value:'',textContent:'',append(child){this.children.push(child)}}}
scope.document={getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},createElement:element};
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
new vm.Script(inline); // Validate the rest of the app as well as the menu initialization.
vm.runInContext(inline.slice(0,inline.indexOf('const presets=')),scope);
const {songs,suite}=vm.runInContext('({songs,suite:suite1012})',scope);
assert.deepEqual(Object.keys(suite),['prelude1012','allemande1012','courante1012','sarabande1012','gavotte','gavotte2','gigue1012']);
assert.equal(Object.keys(songs).length,25,'22 retained selections plus Sor Op.35 No.17, Op.6 No.11 and BWV1009 Bourree I');
const groups=elements.get('song').children;
assert.equal(groups.length,6);assert.equal(groups[0].children.length,7);assert.equal(groups[1].children.length,7);
assert.equal(elements.get('song').value,'gavotte');
assert(elements.get('song-info').textContent.includes('63秒'));
const expected={prelude1012:[1349,623.5],allemande1012:[541,80.25],courante1012:[639,216],sarabande1012:[301,192],gavotte:[258,114],gavotte2:[214,98],gigue1012:[655,204.5]};
for(const [key,{score}] of Object.entries(suite)){
 const [count,end]=expected[key];assert.equal(score.events.length,count);
 let previous=-Infinity;
 for(const event of score.events){
  assert.equal(event.length,3);assert(event.every(Number.isFinite));
  const [at,midi,duration]=event;
  assert(at>=0&&at>=previous);assert(Number.isInteger(midi)&&midi>=21&&midi<=108);assert(duration>0);
  previous=at;
 }
 assert.equal(score.events[0][0],0);
 assert.equal(Math.max(...score.events.map(([at,,d])=>at+d)),end,'Include the last measure');
 elements.get('song').value=key;vm.runInContext('updateSong()',scope);
 assert(elements.get('song-info').textContent.includes('♩ = '+score.bpm));
}
for(const id of [1494,1503,1504,1505,1506,1507,1508])assert(html.includes('piece-info.cgi?id='+id));
assert(html.includes('https://creativecommons.org/licenses/by-sa/3.0/'));
console.log('BWV 1012: all seven complete note sequences, grouped menu, durations, credits, and retained BWV 1007 songs passed');

const model=require('./sequencer-model.js');
const sorExpected=[[63,63,60,[4,4]],[135,119,55,[3,4]],[115,95,48,[4,4]],[107,72,55,[3,4]],[211,119.5,45,[6,8]]];
assert.equal(groups[2].children.length,6);
for(let i=1;i<=5;i++){
 const key='sor60_'+i,song=songs[key],doc=model.fromSong(key,song);
 const [count,end,first,meter]=sorExpected[i-1];
 assert.equal(doc.notes.length,count);assert.deepEqual(doc.meter,meter);
 assert.equal(doc.notes[0].pitch,first);
 assert.equal(Math.max(...doc.notes.map(n=>n.beat+n.duration)),end);
 assert(doc.source.credit.includes('Fernando Sor'));assert(doc.source.credit.includes('Fabrice De Volder'));
 assert.equal(doc.source.license,[3,5].includes(i)?'CC BY-SA 3.0':'CC BY-SA 2.5');
 assert(doc.source.url.includes('sor_op60-0'+i));
 elements.get('song').value=key;vm.runInContext('updateSong()',scope);
 assert(elements.get('song-info').textContent.includes('♩ = '+song.score.bpm));
}
console.log('Sor Op.60: five complete scores, sounding pitches, meters, credits and menu passed');

const sor12=model.fromSong('sor60_12',songs.sor60_12);
assert.equal(sor12.notes.length,149);assert.deepEqual(sor12.meter,[2,4]);
assert.equal(sor12.bpm,80);assert.equal(sor12.notes[0].pitch,62);
assert.equal(Math.max(...sor12.notes.map(n=>n.beat+n.duration)),50);
assert(sor12.source.credit.includes('Hajo Dezelski'));assert.equal(sor12.source.license,'CC BY-SA 3.0');
assert(sor12.source.url.includes('sor_op60-12'));
console.log('Sor Op.60 No.12: complete sequence, meter, tempo and credits passed');

assert.equal(groups[3].children.length,2);assert.equal(groups[3].children[0].value,'sor6_8');
const sor6=model.fromSong('sor6_8',songs.sor6_8);
assert.equal(sor6.notes.length,295);assert.deepEqual(sor6.meter,[3,4]);assert.equal(sor6.bpm,88);
assert.equal(Math.max(...sor6.notes.map(n=>n.beat+n.duration)),117);
assert.deepEqual(Array.from(sor6.notes.filter(n=>n.beat===0),n=>n.pitch),[48,60,64]);
assert.equal(Math.min(...sor6.notes.map(n=>n.pitch)),41);
assert.equal(Math.max(...sor6.notes.map(n=>n.pitch)),71);
assert(sor6.notes.some(n=>n.duration<0.25),'Preserve grace notes');
assert(sor6.source.credit.includes('Glen Larsen'));assert.equal(sor6.source.license,'CC BY-SA 4.0');
assert(sor6.source.url.endsWith('id=2128'));
elements.get('song').value='sor6_8';vm.runInContext('updateSong()',scope);
assert(elements.get('song-info').textContent.includes('80秒'));
assert(elements.get('song-info').textContent.includes('♩ = 88'));
assert(html.includes('https://creativecommons.org/licenses/by-sa/4.0/'));
console.log('Sor Op.6 No.8: full score, chords, grace notes, meter, menu, duration and credits passed');

assert.equal(groups[4].children[1].value,'sor35_22');
const newKeys=['menuet1007','menuet2_1007','sor35_22'];
for(const key of newKeys){
 const song=songs[key],doc=model.fromSong(key,song);
 assert.deepEqual(doc.meter,[3,4]);assert.equal(doc.endBeat,key==='sor35_22'?144:72);
 assert.equal(doc.notes.length,key==='sor35_22'?416:key==='menuet1007'?134:126);
 for(const field of ['licenseUrl','modifications','pitch','terms'])assert.equal(doc.source[field],song.source[field]);
 const library=new model.Library({[key]:song},{getItem:()=>null,setItem(){}});
 const copy=library.duplicate(key),loaded=library.import(library.export(copy));
 assert.deepEqual(loaded.source,copy.source);assert.equal(loaded.endBeat,copy.endBeat);
 assert.deepEqual(model.toSong(loaded).source,copy.source);assert.deepEqual(model.toSong(loaded).score.meter,[3,4]);
 assert.equal(model.toSong(loaded).score.endBeat,copy.endBeat);
 elements.get('song').value=key;vm.runInContext('updateSong()',scope);
 assert(elements.get('song-info').textContent.includes(key==='sor35_22'?'86秒':'36秒'));
}
assert.throws(()=>model.normalize({...model.fromSong('sor35_22',songs.sor35_22),endBeat:Infinity}));
console.log('Three additions: menu, duration including final rest, all voices, source metadata and export/import roundtrip passed');
