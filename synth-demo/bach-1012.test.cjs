'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const scope=vm.createContext({});
for(const file of ['gavotte.js','prelude.js','bach-solos.js','bach-1012.js','sor-op60.js']){
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
assert.equal(Object.keys(songs).length,17,'Keep the five existing BWV 1007 selections');
const groups=elements.get('song').children;
assert.equal(groups.length,3);assert.equal(groups[0].children.length,7);assert.equal(groups[1].children.length,5);
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
assert.equal(groups[2].children.length,5);
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
