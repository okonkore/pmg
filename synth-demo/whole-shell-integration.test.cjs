const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('frozen sample: scheduling, transposition, mixing and cleanup',async()=>{
 const code=fs.readFileSync(__dirname+'/instruments/guitar-whole-shell/instrument.js','utf8').replace('export async function','async function').replace("new URL('./e4.wav', import.meta.url)","'e4.wav'");
 const sources=[],volumes=[];const destination={};const buffer={duration:2};let fetches=0;
 const context={currentTime:3,destination,decodeAudioData:async()=>buffer,
  createBufferSource(){const node={playbackRate:{},connect(n){this.target=n;return n},disconnect(){this.disconnected=true},start(t){this.when=t}};sources.push(node);return node},
  createGain(){const node={gain:{},connect(n){this.target=n;return n},disconnect(){this.disconnected=true}};volumes.push(node);return node}};
 const sandbox={fetch:async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}}};
 vm.createContext(sandbox);vm.runInContext(code+';this.loadGuitar=loadGuitar',sandbox);
 const instrument=await sandbox.loadGuitar(context,{destination});
 const a=instrument.play({midi:64,when:5});const b=instrument.play({midi:52,gain:.7,when:1});
 assert.equal(fetches,1);assert.equal(a.buffer,buffer);assert.equal(b.buffer,buffer);
 assert.equal(a.playbackRate.value,1);assert.equal(b.playbackRate.value,.5);
 assert.equal(a.when,5);assert.equal(b.when,3);assert.equal(volumes[1].gain.value,.7);assert.equal(volumes[0].target,destination);
 a.onended();assert.ok(a.disconnected&&volumes[0].disconnected);
});

test('app voice preserves natural decay and stops/cleans up explicitly',()=>{
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 const code=html.slice(html.indexOf('function playWholeShell('),html.indexOf('function presetsName('));
 const sources=[];let cleanups=0;
 const sandbox={wholeShellInstrument:{play(options){const s={options,onended(){cleanups++},stop(){this.stopped=true}};sources.push(s);return s}},voices:new Map(),allVoices:new Set(),refreshKeys(){},$:()=>({}),noteName:String,presetsName:()=> 'B'};
 vm.createContext(sandbox);vm.runInContext(code,sandbox);
 const a=sandbox.playWholeShell('a',64,10,1);const b=sandbox.playWholeShell('b',60,11,.5);
 assert.equal(sandbox.allVoices.size,2);a.release(10.1);assert.equal(sources[0].stopped,undefined);
 a.kill();a.kill();assert.equal(cleanups,1);assert.equal(sandbox.voices.has('a'),false);assert.equal(sandbox.allVoices.size,1);
 sources[1].onended();assert.equal(sandbox.allVoices.size,0);assert.equal(cleanups,2);
 assert.match(html,/if\(p.engine==='whole-shell'\)return playWholeShell/);
 assert.match(html,/await ensureWholeShell\(\)/);
 assert.match(fs.readFileSync(__dirname+'/../.github/workflows/pages.yml','utf8'),/cp -R synth-demo\/instruments _site\//);
});


test('app voice forwards scheduled note-off to a sample with release support',()=>{
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 const code=html.slice(html.indexOf('function playWholeShell('),html.indexOf('function presetsName('));
 let released,cleaned=0;const source={onended(){cleaned++},release(at){released=at},stop(){}};
 const sandbox={ctx:{currentTime:3},wholeShellInstrument:{play(){return source}},voices:new Map(),allVoices:new Set(),refreshKeys(){},$:()=>({}),noteName:String,presetsName:()=> 'sample'};
 vm.createContext(sandbox);vm.runInContext(code,sandbox);const voice=sandbox.playWholeShell('a',64,5,1);
 voice.release(5.2);assert.equal(released,5.2);voice.kill();voice.release(6);assert.equal(released,5.2);assert.equal(cleaned,1);
});
