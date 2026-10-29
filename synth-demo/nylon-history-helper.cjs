// Frozen release SOURCE is rendered in the same JS engine as the code under test.
// This preserves byte-exact historical regression checks without engine-specific PCM goldens.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.join(__dirname,'test-fixtures/nylon-history'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),models=new Map();
function model(name){
 if(!models.has(name)){
  const entry=manifest[name];assert(entry,`Unknown historical source: ${name}`);const scope=vm.createContext({});
  for(const f of entry.files){const source=fs.readFileSync(path.join(root,f.file));assert.equal(crypto.createHash('sha256').update(source).digest('hex'),f.sha256,`Historical source integrity: ${f.file}`);vm.runInContext(source.toString(),scope,{filename:f.original+'@'+entry.commit});}
  models.set(name,vm.runInContext('NylonBridgeModel',scope));
 }
 return models.get(name);
}
function bytes(y){return Buffer.from(y.buffer,y.byteOffset,y.byteLength)}
function equal(actual,name,rate,midi,settings,message){
 const expected=model(name).render(rate,midi,settings);
 assert.equal(actual.length,expected.length,message+' (length)');
 assert.ok(bytes(actual).equals(bytes(expected)),`${message}: differs from pinned ${name} source in this engine`);
}
module.exports={model,equal,bytes};
