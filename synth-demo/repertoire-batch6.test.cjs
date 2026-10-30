'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),M=require('./sequencer-model');
const scope=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'repertoire-batch6.js'),'utf8'),scope);const songs=vm.runInContext('repertoireBatch6',scope);
let stored=null;const storage={getItem:()=>stored,setItem:(_k,v)=>stored=v},library=new M.Library(songs,storage);
const expected={tarrega_adelita:[313,120,76,'2.5'],aguado3_1:[763,168,72,'4.0'],carcassi60_2:[689,160,77,'3.0']};
for(const [key,[count,end,high,license]] of Object.entries(expected)){
 const original=library.get(key),before=JSON.stringify(original),copy=library.duplicate(key);assert.equal(original.notes.length,count);assert.equal(original.endBeat,end);assert.equal(Math.min(...original.notes.map(n=>n.pitch)),40);assert.equal(Math.max(...original.notes.map(n=>n.pitch)),high);assert.equal(original.source.license,'CC BY-SA '+license);
 const history=new M.History(copy);history.edit(d=>{d.notes[0].pitch++;d.title+=' edited'});library.save(history.current);const imported=library.import(library.export(history.current));
 assert.deepEqual(imported.source,original.source);assert.equal(imported.endBeat,end);assert.deepEqual(M.toSong(imported).source,original.source);assert.deepEqual(new M.Library({},storage).get(imported.id).source,original.source);assert.equal(JSON.stringify(library.get(key)),before);
 for(const [field,value] of Object.entries(songs[key].source)){assert.equal(imported.source[field],value);assert(value.length<=500)}
}
console.log('PASS: batch6 complete forms, original guitar ranges, separate licenses, immutable originals, edited copies and source/form/end metadata export/import/reload.');
