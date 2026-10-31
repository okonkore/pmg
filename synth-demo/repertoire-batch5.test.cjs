'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('./sequencer-model.js'),scope=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'repertoire-batch5.js'),'utf8'),scope);
const songs=vm.runInContext('repertoireBatch5',scope);
let stored=null;
const storage={getItem:()=>stored,setItem:(_key,data)=>{stored=data}};
const library=new M.Library(songs,storage);
const expected={sor35_13:[368,64,41,67,[2,4]],giuliani50_18:[180,33,42,67,[2,4]],carcassi60_9:[836,248,40,76,[4,4]]};
for(const [key,[count,end,low,high,meter]] of Object.entries(expected)){
 const builtin=library.get(key),before=JSON.stringify(builtin);
 assert.equal(builtin.notes.length,count);assert.equal(builtin.endBeat,end);assert.deepEqual(builtin.meter,meter);
 assert.equal(Math.min(...builtin.notes.map(n=>n.pitch)),low);assert.equal(Math.max(...builtin.notes.map(n=>n.pitch)),high);
 assert(builtin.source.credit.includes({sor35_13:'Glen Larsen',giuliani50_18:'Stephen Rhen',carcassi60_9:'Jeff Covey'}[key]));
 assert.equal(builtin.source.license,{sor35_13:'CC BY-SA 4.0',giuliani50_18:'CC BY 3.0',carcassi60_9:'Public Domain'}[key]);
 const copy=library.duplicate(key),history=new M.History(copy);
 history.edit(d=>{d.notes[0].pitch++;d.title+=' edited'});library.save(history.current);
 const loaded=library.import(library.export(history.current));
 assert.deepEqual(loaded.source,builtin.source);assert.equal(loaded.endBeat,end);assert.deepEqual(loaded.meter,meter);
 const song=M.toSong(loaded);assert.deepEqual(song.source,builtin.source);assert.equal(song.score.endBeat,end);
 assert.equal(JSON.stringify(library.get(key)),before,'Editing a copy never changes source music');
 const reloaded=new M.Library({},storage).get(loaded.id);
 assert.deepEqual(reloaded.source,builtin.source);assert.equal(reloaded.endBeat,end);assert.equal(reloaded.notes.length,count);
}
assert.equal(Object.keys(expected).length,3);
console.log('Batch 5: full scores, meters, pitch ranges, protected originals, editable copies, source/end-rest export/import and persistence passed.');

// Exercise the actual app's catalog wiring without constructing its audio engine.
const catalog=vm.createContext({});
for(const file of ['gavotte.js','prelude.js','bach-solos.js','bach-1012.js','sor-op60.js','sor-op6.js','repertoire-batch1.js','repertoire-batch2.js','repertoire-batch3.js','repertoire-batch4.js','catalog-quality.js','repertoire-batch5.js','repertoire-batch6.js','repertoire-batch7.js','bwv1006a-complete.js','bwv1009-complete.js','bwv1004-chaconne.js','bwv1004-complete.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),catalog);
const elements=new Map();
function element(){return {children:[],value:'',textContent:'',append(child){this.children.push(child)}}}
catalog.document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element};
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
assert(html.includes('<script src="repertoire-batch5.js?v=1"></script>'));
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
vm.runInContext(inline.slice(0,inline.indexOf('const presets=')),catalog);
const actual=vm.runInContext('songs',catalog);
assert.equal(Object.keys(actual).length,55);
for(const key of Object.keys(expected)){
 assert.equal(JSON.stringify(actual[key]),JSON.stringify(songs[key]));
 const options=elements.get('song').children.flatMap(g=>g.children);
 assert.equal(options.filter(o=>o.value===key).length,1);
 elements.get('song').value=key;vm.runInContext('updateSong()',catalog);
 assert(elements.get('song-info').textContent.includes({sor35_13:'43秒',giuliani50_18:'15秒',carcassi60_9:'124秒'}[key]));
}
console.log('Batch 5: real app script, exact catalog entries once each, existing 32 retained, and displayed full-score durations passed.');
