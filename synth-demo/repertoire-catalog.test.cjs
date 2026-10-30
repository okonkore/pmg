'use strict';
// Catalog-wide checks supplement individual source/score tests.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('./sequencer-model.js'),scope=vm.createContext({});
for(const name of ['gavotte','prelude','bach-solos','bach-1012','sor-op60','sor-op6','repertoire-batch1','repertoire-batch2','repertoire-batch3','repertoire-batch4','catalog-quality','repertoire-batch5','repertoire-batch6','repertoire-batch7','bwv1006a-complete','bwv1009-complete'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,name+'.js'),'utf8'),scope);
const elements=new Map();
function element(){return {children:[],value:'',textContent:'',append(child){this.children.push(child)}}}
scope.document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element};
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
vm.runInContext(inline.slice(0,inline.indexOf('const presets=')),scope);
const {songs,collections}=vm.runInContext('({songs,collections:[suite1012,suite1007,sorOp60Collection,sorOp6Collection,sorOp35Songs,suite1009,sorOp1Songs,giulianiSongs,carcassiSongs,tarregaSongs,aguadoSongs,suite1006a]})',scope);
const keys=collections.flatMap(Object.keys);
assert.equal(keys.length,50);assert.equal(new Set(keys).size,50,'No spread silently overwrites duplicate keys');
const options=elements.get('song').children.flatMap(group=>group.children);
assert.equal(options.length,50);assert.equal(new Set(options.map(o=>o.value)).size,50);
const legacy=['prelude','allemande','courante','sarabande','gigue','menuet1007','menuet2_1007','prelude1012','allemande1012','courante1012','sarabande1012','gavotte','gavotte2','gigue1012','sor60_1','sor60_2','sor60_3','sor60_4','sor60_5','sor60_12','sor6_8','sor6_11','sor35_17','sor35_22','bourree1009'];
const added=['sor60_8','sor60_9','sor60_10','bourree2_1009','sor1_1','sor1_2','sor1_6','sor35_13','giuliani50_18','carcassi60_9','tarrega_adelita','aguado3_1','carcassi60_2','menuet1006a','menuet2_1006a','bourree1006a','prelude1006a','loure1006a','gavotte1006a','gigue1006a','prelude1009','allemande1009','courante1009','sarabande1009','gigue1009'];
assert.deepEqual([...keys].sort(),[...legacy,...added].sort());
const before=JSON.stringify(songs),missingLicenseLinks=[],missingEndMarkers=[];
for(const [key,song] of Object.entries(songs)){
 const d=M.fromSong(key,song);
 assert(d.notes.length>0&&d.notes.every(n=>n.pitch>=21&&n.pitch<=108&&n.duration>0&&n.beat>=0));
 assert(d.source.credit&&d.source.url&&d.source.license,'Every selection has attribution, source and license');
 assert(/^(Public Domain|CC BY(?:-SA)? (2\.5|3\.0|4\.0))$/.test(d.source.license));
 if(!d.source.licenseUrl)missingLicenseLinks.push(key);
 if(d.endBeat===undefined)missingEndMarkers.push(key);
 else assert(d.endBeat>=Math.max(...d.notes.map(n=>n.beat+n.duration))-1e-9);
 const option=options.find(o=>o.value===key);assert(option&&option.textContent.trim());
 const storage={getItem:()=>null,setItem:()=>{}};
 const lib=new M.Library({},storage),copy=lib.add(d),imported=lib.import(lib.export(copy));
 assert.deepEqual(imported.source,d.source);
 assert.deepEqual(Array.from(imported.notes,n=>[n.beat,n.pitch,n.duration]),Array.from(d.notes,n=>[n.beat,n.pitch,n.duration]));
 if(added.includes(key)){
  assert(d.source.licenseUrl&&d.source.modifications&&d.source.terms&&d.source.pitch);
  assert(Number.isFinite(d.endBeat));
 }
}
assert.equal(JSON.stringify(songs),before,'Catalog QA never mutates source music');
console.log('PASS: 50 unique keys/options, original 25 retained, license/source attribution, note ranges, end markers where provided, every-song metadata/event JSON round-trip.');
console.log('Existing legacy entries lacking dedicated licenseUrl:',missingLicenseLinks.join(', '));
console.log('Existing legacy entries lacking explicit endBeat:',missingEndMarkers.join(', '));

assert.deepEqual(missingLicenseLinks,[]);
assert.deepEqual(missingEndMarkers.sort(),['gavotte2','gigue','gigue1012','sor60_12'].sort());
const fingerprints=JSON.parse(fs.readFileSync(path.join(__dirname,'../scripts/score-sources/catalog-audit/event-fingerprints.json')));
for(const [key,song] of Object.entries(songs)){
 if(fingerprints[key])assert.equal(require('crypto').createHash('sha256').update(JSON.stringify(song.score.events)).digest('hex'),fingerprints[key],key+' note data unchanged');
 if(missingEndMarkers.includes(key))assert(M.fromSong(key,song).source.endingStatus.includes('未確認'));
}
const tuning={instrument:'guitar',pitchesLowToHigh:[41,45,50,55,59,64],automaticallyApplied:false};
const d=M.fromSong('sor1_6',songs.sor1_6);
assert.deepEqual(d.source.requiredTuning,tuning);
assert(d.source.pitch.includes('not automatically applied'));
for(const bad of [null,{...tuning,automaticallyApplied:true},{...tuning,pitchesLowToHigh:[41,45]},{...tuning,pitchesLowToHigh:[41,45,50,55,59,58]}])assert.throws(()=>M.normalize({...d,source:{...d.source,requiredTuning:bad}}));
const copy=M.normalize(d);copy.source.requiredTuning.pitchesLowToHigh[0]=40;
assert.equal(d.source.requiredTuning.pitchesLowToHigh[0],41,'Independent arrays');
assert.deepEqual(M.fromSong('copy',M.toSong(d)).source.requiredTuning,tuning);
console.log('PASS: previous32 event fingerprints unchanged; 19 license links, 15 verified endings, 4 explicit unknowns; structured tuning validation and independent round-trip.');

const checkpoint35=JSON.parse(fs.readFileSync(path.join(__dirname,'../scripts/score-sources/repertoire-batch6/checkpoint35.json')));
assert.equal(Object.keys(checkpoint35).length,35);
for(const [key,hash] of Object.entries(checkpoint35))assert.equal(require('crypto').createHash('sha256').update(JSON.stringify(songs[key])).digest('hex'),hash,key+' entire35-checkpoint song unchanged');
console.log('PASS: all35 checkpoint songs unchanged including source metadata, end markers and notes.');

const checkpoint38=JSON.parse(fs.readFileSync(path.join(__dirname,"../scripts/score-sources/repertoire-batch7/checkpoint38.json")));
assert.equal(Object.keys(checkpoint38).length,38);
for(const [key,hash] of Object.entries(checkpoint38))assert.equal(require("crypto").createHash("sha256").update(JSON.stringify(songs[key])).digest("hex"),hash,key+" entire previous song unchanged");

const checkpoint41=JSON.parse(fs.readFileSync(path.join(__dirname,"../scripts/score-sources/bwv1006a-complete/checkpoint41.json")));
assert.equal(Object.keys(checkpoint41).length,41);
for(const [key,hash] of Object.entries(checkpoint41))assert.equal(require("crypto").createHash("sha256").update(JSON.stringify(songs[key])).digest("hex"),hash,key+" entire previous song unchanged");
assert.deepEqual(Object.keys(vm.runInContext("suite1006a",scope)),["prelude1006a","loure1006a","gavotte1006a","menuet1006a","menuet2_1006a","bourree1006a","gigue1006a"]);

const checkpoint45=JSON.parse(fs.readFileSync(path.join(__dirname,"../scripts/score-sources/bwv1009-complete/checkpoint45.json")));
assert.equal(Object.keys(checkpoint45).length,45);
for(const [key,hash] of Object.entries(checkpoint45))assert.equal(require("crypto").createHash("sha256").update(JSON.stringify(songs[key])).digest("hex"),hash,key+" entire previous song unchanged");
assert.deepEqual(Object.keys(vm.runInContext("suite1009",scope)),["prelude1009","allemande1009","courante1009","sarabande1009","bourree1009","bourree2_1009","gigue1009"]);
