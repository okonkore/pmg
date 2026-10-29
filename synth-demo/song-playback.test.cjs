'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8');
(async()=>{
 const source=read('configured-guitar-app.js'),enableCode=source.slice(source.indexOf('enable=async notes=>'),source.indexOf('\nplay=(id,'));
 for(const saved of [true,false]){
  const prepared=[],ensured=[],config={saved};let opened=0;
  const scope=vm.createContext({baseEnable:async()=>{},selected:()=>true,preparing:false,bank:null,setup:{open:false},settings:saved?config:undefined,draft:undefined,loadDefaults:async()=>config,openSetup:()=>opened++,DOMException,prepare:async(c,midis)=>{prepared.push({c,midis});scope.bank={active:{},has:async()=>true,ensure:async n=>ensured.push(n)}},preparationNotes:()=>[60],songs:{song:{score:{events:[[0,60,1],[0,64,1],[1,67,1]]}}},$:()=>({value:'song'})});
  vm.runInContext(enableCode,scope);await scope.enable([]);
  assert.equal(opened,0);assert.equal(prepared.length,1);assert.equal(prepared[0].c,config);assert.deepEqual(Array.from(prepared[0].midis),[60,64,67]);assert.deepEqual(ensured,[60,64,67]);
  await scope.enable([72]);assert.equal(prepared.length,1);assert.equal(ensured.at(-1),72);
 }
 const elements={};for(const id of ['seq-strum','seq-strum-ms','seq-strum-direction','seq-strum-out'])elements[id]={value:id.endsWith('ms')?'20':'up',checked:false,addEventListener(type,fn){this.change=fn}};
 let stored=JSON.stringify({enabled:true,intervalMs:35,direction:'down'}),stops=0;
 const scope=vm.createContext({document:{getElementById:id=>elements[id]},localStorage:{getItem:()=>stored,setItem:(key,value)=>stored=value},stop:()=>stops++});vm.runInContext(read('song-playback-settings.js'),scope);
 assert.equal(elements['seq-strum-ms'].value,35);assert.equal(elements['seq-strum-direction'].value,'down');assert.equal(elements['seq-strum-ms'].disabled,false);
 elements['seq-strum'].checked=false;elements['seq-strum'].change();assert.equal(elements['seq-strum-ms'].disabled,true);assert.equal(JSON.parse(stored).enabled,false);assert.equal(stops,1);
 const html=read('index.html');assert(html.indexOf('id="song-playback-settings"')<html.indexOf('<header id="editor-header"'));assert(!read('sequencer.js').includes('id="seq-strum"'));
 console.log('Saved/default guitar settings resume without setup; playback options restore, save, and live on the performance screen.');
})().catch(e=>{console.error(e);process.exitCode=1});
