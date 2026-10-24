/* Generic classical outline: physical Rayleigh-Ritz modes, no spectral fitting. */
(function(root){
'use strict';
const D=root.StringClassicalPlateData||(typeof require!=='undefined'?require('./classical-plate-data.js'):null);
function halfWidth(x,data=D){const D=data;const k=D.outlineKnots,s=D.outlineSlopes;let j=0;while(j<k.length-2&&x>=k[j+1][0])j++;const d=k[j+1][0]-k[j][0],t=(x-k[j][0])/d;return (2*t**3-3*t*t+1)*k[j][1]+(t**3-2*t*t+t)*d*s[j]+(-2*t**3+3*t*t)*k[j+1][1]+(t**3-t*t)*d*s[j+1];}
function legendre(x,n){const p=[1];if(n>1)p.push(x);for(let j=2;j<n;j++)p.push(((2*j-1)*x*p[j-1]-(j-1)*p[j-2])/j);return p;}
function shape(mode,x,y,data=D){const D=data;if(x<0||x>D.length)return 0;const w=halfWidth(x,D),dy=y-D.width/2;if(Math.abs(dy)>w||Math.hypot(x-D.holeX,dy)<D.holeRadius)return 0;if(mode.oddTransverse&&Math.abs(dy)<1e-14)return 0;const u=2*x/D.length-1,v=dy/w,a=legendre(u,D.orders[0]),b=legendre(v,D.orders[1]);let value=0;for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)value+=mode.coefficients[i*b.length+j]*a[i]*b[j];return value*(1-u*u)**2*(1-v*v)**2;}
function plateModes(parameters={},count='nine'){return plateModesFromData(D,parameters,count);}
function plateModesFromData(data,parameters={},count='nine'){const D=data;
 if(!['one','nine'].includes(count))throw Error('Unknown classical plate basis');const p={length:D.length,width:D.width,thickness:D.thickness,density:D.density,youngX:D.youngX,youngY:D.youngY,shear:D.shear,poissonXY:D.poissonXY,lossAngle:D.lossAngle,bridgeX:D.bridgeX,bridgeY:D.bridgeY,...parameters};
 for(const [k,v] of Object.entries(p))if(!Number.isFinite(v))throw Error('Invalid classical parameter: '+k);
 for(const k of ['length','width','thickness','density','poissonXY'])if(p[k]!==D[k])throw Error('Classical plate data must be regenerated for '+k);
 const scale=p.youngX/D.youngX;if(!(scale>0&&p.lossAngle>=0)||Math.abs(p.youngY/D.youngY/scale-1)>1e-12||Math.abs(p.shear/D.shear/scale-1)>1e-12)throw Error('Classical plate supports uniform stiffness scaling only');
 if(p.bridgeX<=0||p.bridgeX>=D.length||Math.abs(p.bridgeY-D.width/2)>=halfWidth(p.bridgeX,D)||Math.hypot(p.bridgeX-D.holeX,p.bridgeY-D.width/2)<=D.holeRadius)throw Error('Bridge must lie on the classical plate');
 const den=1-p.poissonXY**2*p.youngY/p.youngX;const modes=D.modes.slice(0,count==='one'?1:9).map(v=>{const w=2*Math.PI*v.hz*Math.sqrt(scale);return {id:'classical-'+v.index,index:v.index,m:v.index,n:0,basisLabel:'numerical classical shape '+v.index,w,hz:w/(2*Math.PI),mass:v.mass,stiffness:v.mass*w*w,damping:p.lossAngle*v.mass*w,bridge:shape(v,p.bridgeX,p.bridgeY,D),effectiveArea:v.area};});
 return {parameters:p,D11:p.youngX*p.thickness**3/(12*den),D22:p.youngY*p.thickness**3/(12*den),D12:p.poissonXY*p.youngY*p.thickness**3/(12*den),D66:p.shear*p.thickness**3/12,modes,geometry:{id:D.id,method:D.method,bracing:D.bracing?{...D.bracing,young:D.bracing.young*scale,lossAngle:p.lossAngle}:null,boundary:'clamped outer edge; natural free soundhole edge',holeX:D.holeX,holeRadius:D.holeRadius,depth:D.depth,cavityVolume:D.cavityVolume,plateArea:D.plateArea,outlineKnots:D.outlineKnots,outlineSlopes:D.outlineSlopes,validation:D.validation,scope:D.scope}};
}
function config(view='sum'){if(!['sum','top','hole'].includes(view))throw Error('Unknown classical observer');const G=root.StringGuided||(typeof require!=='undefined'?require('./guided.js'):null);return {...G.positionConfig('mm80'),excitation:'force',force:G.diameterForceN,nonlinear:false,supportEnabled:false,gain:0,bodyId:'air',bodyView:view,bodyPressureGain:.5,plateModes:'nine',plateGeometry:'classical'};}
const api={halfWidth,shape,plateModes,plateModesFromData,config,data:D};root.StringClassicalPlate=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
