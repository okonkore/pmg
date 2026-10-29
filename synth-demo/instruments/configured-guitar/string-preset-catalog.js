/** Factory inputs, not tone fits. Dimensions: mm; density: kg/m³; modulus: GPa.
 * Versioned IDs must not change meaning: saved selections store only the ID.
 */
const clone=value=>JSON.parse(JSON.stringify(value));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
const notes=[64,59,55,50,45,40];
const nylonDiameters=[.70,.82,1.02,1.30,1.65,2.00];
const plain=(diameters,densityKgM3,youngGPa,lossAngle)=>diameters.map((diameterMm,i)=>({number:i+1,openMidi:notes[i],construction:'plain',diameterMm,densityKgM3,youngGPa,lossAngle}));
const virtual='仮想実験用。実物への装着推奨ではありません。破断・クリープ・ネック強度はモデルに含みません。';
const nylonAssumptions='ナイロンの密度1140 kg/m³、ヤング率2 GPa、内部損失率0.02は仮定値。径は比較用の設計値です。';
const steelAssumptions='鋼の密度7850 kg/m³、ヤング率200 GPa、内部損失率0.001は仮定値。鋼種・加工・張力依存性は未同定。径は比較用の設計値です。';
const experimental=(id,name,strings,assumptions)=>({id,name,strings,readonly:true,category:'experimental',provenance:{kind:'virtual-design',revision:1,sources:[],assumptions,limitations:virtual}});
export function createStringPresetCatalog(defaultConfig){
 return freeze([
  {id:'default',name:'520R 推定条件（標準）',strings:clone(defaultConfig.strings),readonly:true,category:'baseline',provenance:{kind:'legacy-estimate',revision:1,sources:[{url:'./instruments/configured-guitar/default-settings.json',label:'既存の標準設定（変更なし）'}],assumptions:'既存の520R写真・調弦に基づく推定条件。メーカー認証値・製品音色の再現ではありません。',limitations:'標準音源との互換性のため従来の値を維持。'}},
  experimental('factory-nylon-mono-v1','全弦ナイロン単線 · 仮想',plain(nylonDiameters,1140,2,.02),nylonAssumptions),
  experimental('factory-nylon-quarter-mass-v1','超軽量ナイロン · 仮想',plain(nylonDiameters.map(d=>d/2),1140,2,.02),nylonAssumptions+' 全弦ナイロン単線セットの径を半分にして線密度を1/4にしたセット。材料密度は同一。同じ弦長なら振動部分の質量も1/4。張力は固定せず調弦から計算します。'),
  experimental('factory-steel-mono-v1','全弦鋼単線 · 仮想',plain([.25,.33,.42,.56,.74,.98],7850,200,.001),steelAssumptions),
  experimental('factory-steel-thick-v1','極太鋼単線 · 仮想',plain(nylonDiameters,7850,200,.001),steelAssumptions+' 全弦ナイロン単線セットと同じ径。線密度は約6.89倍で張力も非常に大きくなります。ボディの小変形近似の妥当性は保証されません。'),
 ]);
}
