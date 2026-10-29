import {validateSettings} from './settings.js';
const KEY='pmg-physical-guitar-string-sets-v1';
const clone=value=>JSON.parse(JSON.stringify(value));
export class StringSetLibrary{
 constructor(defaultConfig,storage,legacy){
  this.base=validateSettings(defaultConfig);this.storage=storage;this.users=[];this.activeId='default';this.error='';this.loadFailed=false;
  this.builtin={id:'default',name:'520R 推定条件（標準）',strings:clone(this.base.strings),readonly:true};
  try{
   const raw=storage?.getItem(KEY);
   if(raw){
    const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.sets)||data.sets.length>100)throw Error('Invalid string sets');
    const ids=new Set(['default']);this.users=data.sets.map(item=>{if(typeof item.id!=='string'||!item.id.startsWith('set-')||ids.has(item.id))throw Error('Invalid set ID');ids.add(item.id);return {id:item.id,name:this.name(item.name),strings:this.strings(item.strings)}});
    if(ids.has(data.activeId))this.activeId=data.activeId;
   }else if(legacy&&JSON.stringify(this.strings(legacy.strings))!==JSON.stringify(this.base.strings)){
    this.users=[{id:'set-legacy',name:'これまでの弦設定',strings:this.strings(legacy.strings)}];this.activeId='set-legacy';
    try{this.persist(this.users,this.activeId)}catch(e){this.error=e.message}
   }
  }catch{this.users=[];this.activeId='default';this.loadFailed=true;this.error='保存済みの弦セットを読み込めませんでした。元のデータは上書きしません。'}
 }
 name(value){const name=String(value??'').trim();if(!name||name.length>80)throw Error('セット名を1〜80文字で入力してください');return name}
 strings(value){return validateSettings({...this.base,strings:value}).strings}
 list(){return clone([this.builtin,...this.users])}
 get(id=this.activeId){const item=[this.builtin,...this.users].find(s=>s.id===id);if(!item)throw Error('弦セットが見つかりません');return clone(item)}
 persist(users,activeId){
  if(this.loadFailed)throw Error(this.error);
  try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(KEY,JSON.stringify({version:1,activeId,sets:users}))}catch{throw Error('弦セットをブラウザに保存できません。空き容量やブラウザの保存設定を確認してください')}
 }
 save(name,strings,id){
  if(id==='default')throw Error('標準セットは複製して保存してください');
  if(this.users.length>=100&&!id)throw Error('弦セットは100個まで保存できます');
  if(id&&!this.users.some(s=>s.id===id))throw Error('弦セットが見つかりません');
  const item={id:id||'set-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),name:this.name(name),strings:this.strings(strings)};
  const users=id?this.users.map(s=>s.id===id?item:s):[...this.users,item];this.persist(users,item.id);this.users=users;this.activeId=item.id;this.error='';return clone(item);
 }
 select(id){this.get(id);this.persist(this.users,id);this.activeId=id;this.error=''}
 remove(id){
  if(id==='default')throw Error('標準セットは削除できません');this.get(id);
  const users=this.users.filter(s=>s.id!==id),activeId=this.activeId===id?'default':this.activeId;this.persist(users,activeId);this.users=users;this.activeId=activeId;this.error='';
 }
 apply(config){return validateSettings({...config,strings:this.get().strings})}
}
