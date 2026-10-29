/** Exact triangular composition with the original body's pressure poles.
 * Only mechanical mobility is reduced. This avoids a large eigendecomposition
 * on the device and introduces neither new acoustic poles nor an output EQ.
 */
export function appendFullObserver(parts,body,{V,pr,pi,coeff,load,forceLoad,heldNonlinear,heldLinear,keep}){
 const {Matrix}=globalThis.mlMatrix,packet=body.fullObserver,rows=packet.poles.length,columns=V.rows,oldN=keep.length,N=oldN+rows;
 const br=new Matrix(packet.forceReal),bi=new Matrix(packet.forceImag),fv=load.mmul(V),fr=br.mmul(fv),fi=bi.mmul(fv),xr=Matrix.zeros(rows,columns),xi=Matrix.zeros(rows,columns);
 let minSeparation=Infinity;
 for(let row=0;row<rows;row++){const [por,poi]=packet.poles[row];for(let j=0;j<columns;j++){
  const dr=pr[j]-por,di=-poi,w=pi[j],f0r=fr.get(row,j),f0i=fi.get(row,j);minSeparation=Math.min(minSeparation,Math.hypot(dr,w-poi));
  if(w>0){const f1r=fr.get(row,j+1),f1i=fi.get(row,j+1),denr=dr*dr-di*di+w*w,deni=2*dr*di,den=denr*denr+deni*deni;if(den<1e-32)throw Error('放射音との近接モードを分離できません');
   const nxr=dr*f0r-di*f0i+w*f1r,nxi=dr*f0i+di*f0r+w*f1i,nyr=-w*f0r+dr*f1r-di*f1i,nyi=-w*f0i+dr*f1i+di*f1r;
   xr.set(row,j,(nxr*denr+nxi*deni)/den);xi.set(row,j,(nxi*denr-nxr*deni)/den);xr.set(row,j+1,(nyr*denr+nyi*deni)/den);xi.set(row,j+1,(nyi*denr-nyr*deni)/den);j++;
  }else{const den=dr*dr+di*di;if(den<1e-24)throw Error('放射音との近接モードを分離できません');xr.set(row,j,(f0r*dr+f0i*di)/den);xi.set(row,j,(f0i*dr-f0r*di)/den);}
 }}
 const xcR=xr.mmul(coeff),xcI=xi.mmul(coeff),bfR=br.mmul(forceLoad),bfI=bi.mmul(forceLoad),outMechanical=new Float64Array(columns);
 for(let row=0;row<rows;row++)for(let j=0;j<columns;j++)outMechanical[j]+=packet.outputReal[row]*xr.get(row,j)-packet.outputImag[row]*xi.get(row,j);
 const extended={...parts};for(const key of ['p','initial','linear','out']){extended[key]=new Float64Array(2*N);extended[key].set(parts[key]);}for(const key of ['Q','B']){extended[key]=new Float64Array(2*N*125);for(let j=0;j<125;j++)extended[key].set(parts[key].subarray(2*j*oldN,2*(j+1)*oldN),2*j*N);}
 for(let k=0;k<oldN;k++){const j=keep[k];extended.out[2*k]=outMechanical[j];extended.out[2*k+1]=pi[j]>0?outMechanical[j+1]:0;}
 for(let row=0;row<rows;row++){const k=oldN+row,[por,poi]=packet.poles[row],den=por*por+poi*poi;extended.p[2*k]=por;extended.p[2*k+1]=poi;extended.out[2*k]=packet.outputReal[row];extended.out[2*k+1]=packet.outputImag[row];
  for(const [key,held,column] of [['initial',heldNonlinear,125],['linear',heldLinear,126]]){let r=0,i=0;for(let j=0;j<6;j++){r+=packet.forceReal[row][j]*held.get(j,0);i+=packet.forceImag[row][j]*held.get(j,0);}extended[key][2*k]=-(r*por+i*poi)/den-xcR.get(row,column);extended[key][2*k+1]=-(i*por-r*poi)/den-xcI.get(row,column);}
  for(let j=0;j<125;j++){const index=2*(j*N+k);extended.B[index]=bfR.get(row,j)-xcR.get(row,j);extended.B[index+1]=bfI.get(row,j)-xcI.get(row,j);}
 }
 return {parts:extended,N,fullPressureModes:rows,minSeparation};
}
