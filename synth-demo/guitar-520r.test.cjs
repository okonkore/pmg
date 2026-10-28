const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
const folder=path.join(__dirname,'instruments/guitar-520r-spruce');
function setup(fail){
 const sources=[],progress=[],destination={},buffers=new Map();let requests=0;
 const notes=[21,40,50,64].map(midi=>({midi,file:midi+'.wav'}));
 const context={currentTime:2,destination,async decodeAudioData(data){const buffer={midi:new Uint8Array(data)[0]};buffers.set(buffer.midi,buffer);return buffer},createBufferSource(){const s={playbackRate:{},connect(n){return n},disconnect(){this.disconnected=true},start(at){this.at=at}};sources.push(s);return s},createGain(){return {gain:{},connect(){},disconnect(){}}}};
 const sandbox={URL,fetch:async url=>{requests++;const file=new URL(url).pathname.split('/').pop();return {ok:!fail,status:503,json:async()=>({notes}),arrayBuffer:async()=>Uint8Array.of(parseInt(file)).buffer}}};
 vm.createContext(sandbox);const code=fs.readFileSync(folder+'/instrument.js','utf8').replace('export async function','async function').replaceAll('import.meta.url',"'https://example.test/instrument.js'");vm.runInContext(code+';this.loadGuitar=loadGuitar',sandbox);
 return {sandbox,context,sources,progress,buffers,get requests(){return requests}};
}
test('each rendered pitch uses its own buffer without transposition; schedule, velocity and cleanup',async()=>{
 const s=setup();const guitar=await s.sandbox.loadGuitar(s.context,{onProgress:(done,total)=>s.progress.push([done,total])});assert.equal(s.requests,5);assert.equal(s.progress.length,4);
 for(const midi of [21,40,50,64]){const source=guitar.play({midi,gain:.6,when:5});assert.equal(source.buffer,s.buffers.get(midi));assert.equal(source.playbackRate.value,1);assert.equal(source.at,5);source.onended();assert.equal(source.disconnected,true)}
 const outside=guitar.play({midi:76,when:0});assert.equal(outside.buffer,s.buffers.get(64));assert.equal(outside.playbackRate.value,2);assert.equal(outside.at,2);
 for(const bad of [{midi:NaN},{gain:-1},{when:Infinity}])assert.throws(()=>guitar.play(bad));
});
test('HTTP failure is reported',async()=>{const s=setup(true);await assert.rejects(()=>s.sandbox.loadGuitar(s.context),/HTTP 503/)});
test('photo specification, complete sample bank, WAV hashes and physical conditions',()=>{
 const config=JSON.parse(fs.readFileSync(folder+'/config.json'));assert.deepEqual(config.strings.map(s=>s.outerDiameterMm),[.7,.82,1.02,.74,.85,1.07]);assert.equal(config.soundboard.thicknessMm,2.5);
 const manifest=JSON.parse(fs.readFileSync(folder+'/manifest.json'));assert.equal(manifest.notes.length,68);assert.deepEqual(manifest.notes.map(n=>n.midi),Array.from({length:68},(_,i)=>21+i));assert.equal(new Set(manifest.notes.map(n=>n.sha256)).size,68);
 const strings=new Set();for(const note of manifest.notes){strings.add(note.string);const bytes=fs.readFileSync(path.join(folder,note.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),note.sha256);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt32LE(24),48000);assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt16LE(34),16);assert.equal(bytes.length,44+48000*3*2);assert.ok(note.peakFS<.95);assert.equal(note.physics.states,3565);assert.ok(note.physics.maxPoleReal<0);assert.ok(note.physics.render96To192kRelativeError<.005);assert.ok(Math.abs(note.physics.fixedEndHz/(440*2**((note.midi-69)/12))-1)<1e-10);for(const check of note.physics.frequencyChecks)assert.ok(check.stateVsSchurRelativeError<1e-6);}
 const low=manifest.notes.filter(n=>n.midi<40);assert.equal(low.length,19);
 const reference=manifest.notes.find(n=>n.midi===40).physics;
 for(const note of low){const p=note.physics;assert.equal(note.string,6);assert.equal(note.fret,0);assert.equal(p.speakingLengthM,.65);assert.equal(p.lowTension,true);assert.equal(p.mu,reference.mu);assert.equal(p.ei,reference.ei);assert.ok(p.tension>0&&p.tension<reference.tension);assert.ok(p.pullMm<=5.00000001);assert.equal(p.tuningOffsetSemitones,note.midi-40);}
 assert.equal(strings.size,6);
});
