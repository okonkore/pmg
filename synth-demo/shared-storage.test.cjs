const assert=require('node:assert/strict'),M=require('./sequencer-model.js');
let raw=null;const storage={getItem:()=>raw,setItem:(k,v)=>{raw=v}};
const a=new M.Library({},storage),initial=a.create();
const b=new M.Library({},storage);const modified=b.get(initial.id);modified.title='From other UI';assert(b.save(modified));const latest=raw;
const stale=a.get(initial.id);stale.title='Unsaved local';assert.equal(a.save(stale),false);assert.equal(raw,latest);assert.match(a.error,/別の画面/);assert.equal(JSON.parse(a.export(stale)).song.title,'Unsaved local');
assert.throws(()=>a.addSaved(stale),/別の画面/);assert.equal(raw,latest);
const fresh=new M.Library({},storage);assert.equal(fresh.get(initial.id).title,'From other UI');assert(fresh.save(fresh.get(initial.id)));
raw=null;assert.equal(fresh.save(fresh.get(initial.id)),false,'do not resurrect externally deleted content');assert.equal(raw,null);
console.log('PASS: stale tab save/add blocked without clobbering, export retained, refreshed same-key data editable, external delete protected');
