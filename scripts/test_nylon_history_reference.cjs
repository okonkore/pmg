const assert=require('node:assert/strict'),history=require('../synth-demo/nylon-history-helper.cjs');
const settings={bodyFit:1,referenceTone:1,attack:1,dropD:false,stringTexture:1,highDecay:1},rate=44100,midi=40;
const original=history.model('wound').render(rate,midi,settings);
history.equal(original,'wound',rate,midi,settings,'Deterministic historical render');
const changed=new Float32Array(original),bits=new Uint32Array(changed.buffer),index=changed.findIndex(v=>v!==0&&Number.isFinite(v));bits[index]++;
assert.throws(()=>history.equal(changed,'wound',rate,midi,settings,'One ULP mutation'),/differs from pinned/);
assert.throws(()=>history.equal(original.subarray(1),'wound',rate,midi,settings,'Truncation'),/length/);
assert.throws(()=>history.model('HEAD'),/Unknown historical source/);
console.log('PASS: deterministic pinned source; one-ULP mutation, truncated audio and unpinned reference rejected');
