'use strict';
const assert=require('node:assert/strict');
const M=require('./sequencer-model.js');
const makeSongs=()=>({gavotte:{label:'Gavotte I',edition:'全曲',score:{title:'BWV 1012 — Gavotte I',bpm:108,events:[[0,50,1],[0,57,1],[1.25,62,.5]]}}});
let stored='';const storage={getItem:()=>stored||null,setItem:(key,value)=>stored=value};
const songs=makeSongs(),before=JSON.stringify(songs),library=new M.Library(songs,storage);
assert.throws(()=>songs.gavotte.score.events.push([9,90,1]),TypeError);
assert.throws(()=>songs.gavotte.score.events[0][1]=90,TypeError);
const original=library.get('gavotte'),copy=library.duplicate('gavotte');
assert(copy.id.startsWith('user-'));assert.equal(copy.notes.length,3);assert.equal(copy.source.license,'CC BY-SA 3.0');assert.notEqual(copy.notes[0].id,original.notes[0].id);
const h=new M.History(copy);h.edit(d=>{d.notes[0].pitch=51;d.bpm=120});
library.save(h.current);assert.equal(songs[copy.id].score.events[0][1],51);assert.equal(JSON.stringify(songs.gavotte),JSON.stringify(JSON.parse(before).gavotte));
assert(h.undo());assert.equal(h.current.notes[0].pitch,50);assert(h.redo());assert.equal(h.current.bpm,120);
h.undo();h.edit(d=>d.title='別の編集');assert.equal(h.future.length,0);
const protectedHistory=new M.History(original,true);assert.throws(()=>protectedHistory.edit(d=>d.notes=[]),/内蔵曲/);assert.throws(()=>library.save(original),/内蔵曲/);assert.throws(()=>library.remove('gavotte'),/内蔵曲/);
const restored=new M.Library(makeSongs(),storage);assert.equal(restored.get(copy.id).notes[0].pitch,51);
const imported=restored.import(library.export(h.current));assert.notEqual(imported.id,copy.id);assert.equal(imported.notes.length,3);assert.equal(imported.source.license,'CC BY-SA 3.0');
assert.throws(()=>library.import(JSON.stringify({format:'pmg-song',version:1,song:{...copy,notes:[{beat:-1,pitch:60,duration:1}]}})),/範囲外/);
assert.throws(()=>M.normalize({...copy,bpm:0}),/テンポ/);assert.throws(()=>M.normalize({...copy,notes:[{beat:0,pitch:60,duration:1,velocity:0}]}),/ベロシティ/);
const duplicateIds=M.normalize({...copy,notes:[{id:'x',beat:1,pitch:60,duration:1},{id:'x',beat:0,pitch:62,duration:1}]});assert.notEqual(duplicateIds.notes[0].id,duplicateIds.notes[1].id);assert.equal(duplicateIds.notes[0].beat,0);
let writes=0;const broken=new M.Library(makeSongs(),{getItem:()=>'{bad JSON',setItem:()=>writes++});broken.create();assert.equal(writes,0,'Do not overwrite unreadable saved songs');assert(broken.error);
const quota=new M.Library(makeSongs(),{getItem:()=>null,setItem:()=>{throw Error('quota')}});const unsaved=quota.create();assert(quota.get(unsaved.id));assert(quota.error);
const empty=library.create();assert.equal(M.toSong(empty).score.events.length,0);library.remove(empty.id);assert(!songs[empty.id]);
console.log('Protected built-ins, independent copies, undo/redo, persistence/reload, export/import, validation, and storage failure recovery passed');

const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),scope=vm.createContext({});
for(const file of ['gavotte.js','prelude.js','bach-solos.js','bach-1012.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),scope);
const repertoire=vm.runInContext('({gavotte:{score:gavotteScore},prelude:{score:preludeScore},...bachSoloSongs,...bach1012Songs})',scope);
const fullLibrary=new M.Library(repertoire,{getItem:()=>null,setItem(){}});
for(const key of Object.keys(repertoire)){const doc=fullLibrary.get(key);assert(doc.notes.length>0);assert(doc.source.credit.includes('Mutopia'));}
assert.deepEqual(fullLibrary.get('prelude1012').meter,[12,8]);assert.deepEqual(fullLibrary.get('sarabande1012').meter,[3,2]);
console.log('All 12 built-in scores convert to read-only piano-roll documents, including short ornaments and compound meters.');

// Playback offsets must preserve the score, note ends, and loop boundaries.
const chordEvents=[[0,67,1,.6],[0,60,1,.8],[0,64,1,.7],[1,72,.5,1]],chordSnapshot=JSON.stringify(chordEvents);
const strummed=M.playbackEvents(chordEvents,120,{enabled:true,intervalMs:20});
assert.deepEqual(strummed.map(e=>e[1]),[60,64,67,72]);
assert.deepEqual(strummed.map(e=>e[0]),[0,.04,.08,1]);
for(const e of strummed){const source=chordEvents.find(n=>n[1]===e[1]);assert(Math.abs(e[0]+e[2]-source[0]-source[2])<1e-12);assert.equal(e[3],source[3]);}
assert.equal(JSON.stringify(chordEvents),chordSnapshot);
assert.deepEqual(M.playbackEvents(chordEvents,120),chordEvents);
assert.deepEqual(M.playbackEvents(chordEvents,120,{enabled:true,direction:'down'}).map(e=>e[1]),[67,64,60,72]);
const dense=M.playbackEvents([[0,60,.01],[0,64,.01],[0,67,.01],[.005,72,.01]],300,{enabled:true,intervalMs:100});
assert(dense.slice(0,3).every(e=>e[0]<.005&&e[2]>0));
assert.deepEqual(M.playbackEvents([],120,{enabled:true}),[]);
assert.deepEqual(M.playbackEvents([[0,60,1]],120,{enabled:true}),[[0,60,1]]);
console.log('Strum direction, timing, short chords, score immutability, and unchanged note ends passed.');
