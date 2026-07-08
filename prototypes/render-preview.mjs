import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'fs';

const LEVELS = {"L0":{"boundary":[[286,784],[304,518],[366,427],[471,393],[891,409],[971,414],[1056,465],[1084,525],[1072,679],[1049,746],[994,842],[919,893],[892,908],[679,962],[574,967],[477,950],[352,900]],"districts":[{"id":"forte","poly":[[641,632],[671,625],[688,634],[703,648],[725,664],[712,705],[678,704],[637,690],[625,685],[615,664],[625,634]]},{"id":"alta-daren","poly":[[546,516],[635,516],[680,504],[780,529],[887,569],[913,641],[878,724],[823,775],[732,811],[637,810],[571,798],[517,780],[480,751],[444,682],[434,618],[487,546]]},{"id":"vila-aberta","poly":[[471,393],[556,419],[544,518],[486,547],[431,618],[445,683],[302,714],[313,678],[304,518],[366,427]]},{"id":"quartel-topo","poly":[[308,713],[445,682],[481,749],[514,781],[524,831],[532,955],[477,950],[352,900],[286,784]]},{"id":"brita","poly":[[514,777],[571,798],[638,810],[734,809],[823,775],[919,893],[892,908],[679,962],[574,967],[530,957],[525,828]]},{"id":"campo-alto","poly":[[554,416],[681,453],[776,426],[891,409],[971,414],[1056,465],[1084,525],[1072,679],[1049,746],[994,842],[917,891],[826,775],[878,723],[915,639],[889,564],[780,527],[678,504],[634,516],[543,511]]}],"elevators":[[714,814],[669,640],[935,658],[690,511],[957,809],[446,692]],"center":[665,662],"gates":true,"citadel":"forte"},
"L4":{"boundary":[[270,588],[324,444],[423,387],[570,341],[692,327],[715,327],[802,332],[892,369],[1380,658],[1467,826],[1413,889],[1305,917],[749,948],[585,935],[314,719]],"districts":[{"id":"quartel-selado","poly":[[585,561],[714,520],[776,565],[807,629],[774,704]]},{"id":"selado","poly":[[423,387],[459,480],[585,561],[774,704],[797,720],[818,770],[849,849],[857,911],[749,948],[585,935],[580,865],[510,785],[418,780],[314,719],[270,588],[324,444]]},{"id":"suspensao","poly":[[842,549],[920,589],[987,644],[955,708],[818,770],[797,720],[774,704],[807,629],[776,565]]},{"id":"rebanhos","poly":[[1073,889],[1154,913],[1305,917],[1413,889],[1467,826],[1411,749],[1380,658],[1291,628],[1211,613],[1008,570],[977,528],[993,524],[972,510],[957,506],[842,549],[920,589],[987,644],[955,708],[818,770],[849,849],[857,911],[887,899],[963,884]]},{"id":"eco","poly":[[715,327],[734,388],[714,520],[776,565],[842,549],[957,506],[967,428],[892,369],[802,332]]},{"id":"quatro-ceus","poly":[[570,341],[692,327],[715,327],[734,388],[714,520],[585,561],[459,480],[423,387],[505,371]]}],"elevators":[[876,510],[478,478],[714,814],[669,640],[935,658],[690,511],[957,809],[446,692]],"center":null,"gates":false,"citadel":null}};
const GREEN = { rebanhos:.72, eco:.55, "quatro-ceus":.38, "campo-alto":.22, selado:.08, suspensao:.08, "quartel-selado":0, "quartel-topo":.15, "vila-aberta":.06, brita:.05, "alta-daren":.04, forte:0 };

function hashSeed(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){a=a>>>0;return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function makeNoise(seed){const at=(i,j)=>{let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+seed)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};const sm=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;return(x,y)=>{const x0=Math.floor(x),y0=Math.floor(y),tx=sm(x-x0),ty=sm(y-y0);const a=mix(at(x0,y0),at(x0+1,y0),tx),b=mix(at(x0,y0+1),at(x0+1,y0+1),tx);return mix(a,b,ty)*2-1;};}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],mul=(a,s)=>[a[0]*s,a[1]*s],dot=(a,b)=>a[0]*b[0]+a[1]*b[1],len=a=>Math.hypot(a[0],a[1]);
function norm(a){const l=len(a)||1;return[a[0]/l,a[1]/l];}
function area(p){let s=0;for(let i=0,j=p.length-1;i<p.length;j=i++)s+=(p[j][0]+p[i][0])*(p[j][1]-p[i][1]);return Math.abs(s)/2;}
function signedArea(p){let s=0;for(let i=0,j=p.length-1;i<p.length;j=i++)s+=(p[j][0]*p[i][1]-p[i][0]*p[j][1]);return s/2;}
function centroid(p){let x=0,y=0;for(const q of p){x+=q[0];y+=q[1];}return[x/p.length,y/p.length];}
function bbox(p){let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const q of p){a=Math.min(a,q[0]);b=Math.min(b,q[1]);c=Math.max(c,q[0]);d=Math.max(d,q[1]);}return[a,b,c,d];}
function inPoly(pt,poly){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>pt[1])!==(b[1]>pt[1])&&pt[0]<((b[0]-a[0])*(pt[1]-a[1]))/(b[1]-a[1])+a[0])ins=!ins;}return ins;}
function distToSeg(p,a,b){const ab=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),ab)/(dot(ab,ab)||1)));return len(sub(p,add(a,mul(ab,t))));}
function distToPath(p,path){let m=1e9;for(let i=0;i<path.length-1;i++)m=Math.min(m,distToSeg(p,path[i],path[i+1]));return m;}
function rayDist(C,ang,poly){const dx=Math.cos(ang),dy=Math.sin(ang);let best=Infinity;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[j],b=poly[i],ex=b[0]-a[0],ey=b[1]-a[1];const det=ex*dy-dx*ey;if(Math.abs(det)<1e-9)continue;const rx=a[0]-C[0],ry=a[1]-C[1];const t=(ex*ry-ey*rx)/det,s=(dx*ry-dy*rx)/det;if(t>0&&s>=0&&s<=1)best=Math.min(best,t);}return best===Infinity?120:best;}
function insetRobust(poly,d){const n=poly.length;if(n<3)return null;const c=centroid(poly);const lines=[];for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n];const e=norm(sub(b,a));let nrm=[-e[1],e[0]];const mid=mul(add(a,b),0.5);if(dot(sub(c,mid),nrm)<0)nrm=[-nrm[0],-nrm[1]];lines.push({o:add(a,mul(nrm,d)),d:e});}const out=[];for(let i=0;i<n;i++){const L1=lines[(i-1+n)%n],L2=lines[i];const den=L1.d[0]*L2.d[1]-L1.d[1]*L2.d[0];if(Math.abs(den)<1e-6){out.push(L2.o);continue;}const dx=L2.o[0]-L1.o[0],dy=L2.o[1]-L1.o[1];const t=(dx*L2.d[1]-dy*L2.d[0])/den;out.push([L1.o[0]+L1.d[0]*t,L1.o[1]+L1.d[1]*t]);}return area(out)>1&&signedArea(out)*signedArea(poly)>0?out:null;}
function houseRect(c,dir,w,dep){const nrm=[-dir[1],dir[0]],hw=w/2,hd=dep/2;return[add(c,add(mul(dir,-hw),mul(nrm,-hd))),add(c,add(mul(dir,hw),mul(nrm,-hd))),add(c,add(mul(dir,hw),mul(nrm,hd))),add(c,add(mul(dir,-hw),mul(nrm,hd)))];}
// contiguous, NON-wrapping arc of a loop -> clean crescent polyline
function arcOf(loop,rng,cov){
  const dense=[]; for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length],l=len(sub(b,a)),nn=Math.max(1,Math.round(l/6));for(let k=0;k<nn;k++)dense.push(add(a,mul(sub(b,a),k/nn)));}
  const M=dense.length, cnt=Math.max(3,Math.min(M,Math.floor(cov*M))), si=Math.floor(rng()*(M-cnt));
  return dense.slice(si,si+cnt);
}
function packRow(loop,K,ok,rng,out,refIn){
  for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length],L=len(sub(b,a));if(L<2)continue;
    const dir=norm(sub(b,a));let nrm=[-dir[1],dir[0]];const mid=mul(add(a,b),0.5);if(dot(sub(refIn,mid),nrm)<0)nrm=mul(nrm,-1);
    const step=K.houseW+K.houseGap,nH=Math.floor(L/step);
    for(let k=0;k<nH;k++){const t=(k+0.5)/nH,p=add(a,mul(sub(b,a),t));
      const c=add(p,add(mul(nrm,K.gutter+K.houseD/2),mul(dir,(rng()-0.5)*K.houseW*0.2)));
      if(!ok(c))continue;out.push({poly:houseRect(c,dir,K.houseW*(0.82+rng()*0.34),K.houseD*(0.82+rng()*0.34)),shade:rng()});}}
}
// D-BLOCK: houses ring the parcel; an interior loop road shaped like a 'D' — its
// flat side is the adjacent street (the loop is drawn OPEN on its longest edge,
// which faces the widest road), enclosing a small region.
function ringFill(reg,K,ok,rng,streets,bld){
  packRow(reg,K,ok,rng,bld,centroid(reg));                 // houses fronting the parcel's streets
  const inner=insetRobust(reg, K.houseD+K.gutter);
  if(inner && area(inner)>K.houseW*K.houseW){
    // open the loop on its longest edge -> a 'D' whose flat is the outer road
    let li=0,ll=-1; for(let i=0;i<inner.length;i++){const l=len(sub(inner[(i+1)%inner.length],inner[i]));if(l>ll){ll=l;li=i;}}
    const d=[]; for(let s=1;s<=inner.length;s++) d.push(inner[(li+s)%inner.length]);
    streets.push({pts:d,tier:2});                          // the D road
    packRow(inner,K,ok,rng,bld,centroid(inner));           // inner houses facing the D road
  }
}
// One parcel -> a random occupation: perimeter block, grid mesh, or (occasional) empty yard.
function fillParcel(parcel,K,ok,rng,streets,bld,pick){
  const reg=insetRobust(parcel,K.gutter);
  if(!reg || area(reg)<K.houseW*K.houseD*1.6){ if(reg) fillBlock(reg,K,ok,rng,bld,false); return; }
  if(pick<0.55) ringFill(reg,K,ok,rng,streets,bld);
  else fillBlock(reg,K,ok,rng,bld, pick>0.88);   // grid mesh, sometimes courtyard grid
}
// Fill a block with a mini-grid of houses oriented to its long axis. `court`
// keeps only the perimeter ring (hollow courtyard/garden inside).
function fillBlock(block,K,ok,rng,out,court){
  const inset=insetRobust(block,K.gutter); if(!inset||area(inset)<K.houseW*K.houseD) return;
  let dir=[1,0],best=-1; for(let i=0,j=inset.length-1;i<inset.length;j=i++){const e=sub(inset[i],inset[j]),l=dot(e,e);if(l>best){best=l;dir=norm(e);}}
  const nrm=[-dir[1],dir[0]];
  let uMin=1e9,uMax=-1e9,vMin=1e9,vMax=-1e9;
  for(const p of inset){const u=dot(p,dir),v=dot(p,nrm);uMin=Math.min(uMin,u);uMax=Math.max(uMax,u);vMin=Math.min(vMin,v);vMax=Math.max(vMax,v);}
  const su=K.houseW+K.houseGap, sv=K.houseD+K.houseGap;
  const nu=Math.max(1,Math.round((uMax-uMin)/su)), nv=Math.max(1,Math.round((vMax-vMin)/sv));
  for(let vi=0;vi<nv;vi++) for(let ui=0;ui<nu;ui++){
    if(court && nu>2 && nv>2 && ui>0 && ui<nu-1 && vi>0 && vi<nv-1) continue;
    const u=uMin+(ui+0.5)*(uMax-uMin)/nu + (rng()-0.5)*su*0.2;
    const v=vMin+(vi+0.5)*(vMax-vMin)/nv + (rng()-0.5)*sv*0.2;
    const c=[dir[0]*u+nrm[0]*v, dir[1]*u+nrm[1]*v];
    if(!ok(c)||!inPoly(c,inset)) continue;
    out.push({poly:houseRect(c,dir,K.houseW*(0.82+rng()*0.34),K.houseD*(0.82+rng()*0.34)),shade:rng()});
  }
}

function generate(lvl,cfg,seed){
  const poly=lvl.boundary,C=lvl.center||centroid(poly),rng=mulberry32(seed);
  const terrainN=makeNoise(seed+91),terThr=1-cfg.ter*0.92,greenN=makeNoise(seed+61),patN=makeNoise(seed+37);
  const rough=p=>cfg.ter>0.02&&terrainN(p[0]*0.013,p[1]*0.013)>terThr;
  const cita=lvl.citadel?lvl.districts.find(d=>d.id===lvl.citadel)?.poly:null;
  const hw=5.4-cfg.den*2.2,K={houseW:hw,houseD:hw,houseGap:hw*0.4,gutter:3.2};
  let anchors;
  if(lvl.gates){const nG=cfg.gates,base=rng()*Math.PI*2;anchors=[];for(let i=0;i<nG;i++)anchors.push(base+i/nG*Math.PI*2+(rng()-0.5)*cfg.irr*(Math.PI/nG));}
  else anchors=lvl.elevators.map(e=>Math.atan2(e[1]-C[1],e[0]-C[0]));
  anchors=anchors.map(a=>((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI)).sort((a,b)=>a-b);
  anchors=anchors.filter((a,i)=>i===0||a-anchors[i-1]>0.12);
  const nG=anchors.length;
  const f0=0.16,fr=[f0];for(let i=1;i<=cfg.rings;i++)fr.push(f0+(1-f0)*i/(cfg.rings+1));fr.push(1);
  const ringN=fr.map((_,k)=>makeNoise(seed+100+k*13)),last=fr.length-1,swN=makeNoise(seed+201),styleN=makeNoise(seed+143);
  // swirl bends the mains, but its DIRECTION varies by angle (a per-angle noise),
  // so sectors bow different ways instead of one uniform pinwheel. Applied to every
  // point via its own angle -> rings stay closed, cells stay welded (0 at core/wall).
  const swAmp=0.14+cfg.irr*0.42;
  const swirl=(ang,k)=> swAmp*Math.sin(Math.PI*(k/last))*swN(Math.cos(ang)*1.4,Math.sin(ang)*1.4);
  const rp=(ang,k)=>{const ae=ang+swirl(ang,k);const R=rayDist(C,ae,poly);const wob=k===last?1:1+cfg.irr*0.16*ringN[k](Math.cos(ae)*2.3,Math.sin(ae)*2.3);return add(C,mul([Math.cos(ae),Math.sin(ae)],fr[k]*R*wob));};
  // continuous-radius variant (ff in 0..1) for polar crescent fill
  const rpc=(ang,ff)=>{const sw=swAmp*Math.sin(Math.PI*ff)*swN(Math.cos(ang)*1.4,Math.sin(ang)*1.4);const ae=ang+sw;const R=rayDist(C,ae,poly);return add(C,mul([Math.cos(ae),Math.sin(ae)],ff*R));};
  const roads=[],streets=[],buildings=[],greenCells=[];
  const NA=Math.max(40,nG*6);
  for(const a of anchors){const pts=fr.map((_,k)=>rp(a,k));roads.push({pts,tier:5});}
  for(let k=1;k<=cfg.rings;k++){const loop=[];for(let i=0;i<NA;i++)loop.push(rp(i/NA*Math.PI*2,k));roads.push({pts:loop.concat([loop[0]]),tier:4});}
  const which=p=>{for(const d of lvl.districts)if(inPoly(p,d.poly))return d.id;return null;};
  const arcPts=(a0,a1,k,steps)=>{const o=[];for(let t=0;t<=steps;t++)o.push(rp(a0+(a1-a0)*t/steps,k));return o;};
  const parcelSize=74-cfg.den*22;
  for(let k=0;k<fr.length-1;k++) for(let i=0;i<nG;i++){
    let a0=anchors[i],a1=anchors[(i+1)%nG];if(a1<=a0)a1+=Math.PI*2;
    // the whole sector cell (between two mains, two rings)
    const cst=Math.max(3,Math.round((a1-a0)/(Math.PI*2)*NA));
    const cell=arcPts(a0,a1,k,cst).concat(arcPts(a0,a1,k+1,cst).reverse());
    if(area(cell)<K.houseW*K.houseW*4) continue;
    const cc=centroid(cell), dId=which(cc), gbase=(dId&&GREEN[dId])||0;
    const green = greenN(cc[0]*0.02,cc[1]*0.02)*0.5+0.5 < gbase*cfg.green*1.6;  // 0% -> none
    if(green){ greenCells.push(cell); continue; }
    const ok=p=>inPoly(p,cell)&&!rough(p)&&!(cita&&inPoly(p,cita));
    // SUBDIVIDE the subzone into small parcels; each parcel gets a random
    // occupation (perimeter block / grid mesh). Parcel gaps read as local streets.
    const rIn=fr[k], rOut=fr[k+1], midA=(a0+a1)/2, Rw=rayDist(C,midA,poly);
    const bandPx=(rOut-rIn)*Rw, arcPx=(a1-a0)*rOut*Rw, parcel=parcelSize;
    const nR=Math.max(1,Math.round(bandPx/parcel)), nA=Math.max(1,Math.round(arcPx/parcel));
    // draw the local street grid that separates the parcels
    for(let rr=1;rr<nR;rr++){ const ff=rIn+rr/nR*(rOut-rIn),arc=[]; for(let t=0;t<=6;t++) arc.push(rpc(a0+(a1-a0)*t/6,ff)); streets.push({pts:arc,tier:3}); }
    for(let aa=1;aa<nA;aa++){ const an=a0+aa/nA*(a1-a0); streets.push({pts:[rpc(an,rIn),rpc(an,rOut)],tier:2}); }
    const buildParcel=(f0p,f1p,an0,an1)=>{
      const as=Math.max(2,Math.round((an1-an0)/(a1-a0)*nA*2)+1), pc=[];
      for(let t=0;t<=as;t++) pc.push(rpc(an0+(an1-an0)*t/as, f0p));
      for(let t=as;t>=0;t--) pc.push(rpc(an0+(an1-an0)*t/as, f1p));
      return pc;
    };
    for(let rr=0;rr<nR;rr++) for(let aa=0;aa<nA;aa++){
      const f0p=rIn+(rr)/nR*(rOut-rIn), f1p=rIn+(rr+1)/nR*(rOut-rIn);
      const an0=a0+(aa)/nA*(a1-a0), an1=a0+(aa+1)/nA*(a1-a0);
      const pcl=buildParcel(f0p,f1p,an0,an1);
      if(area(pcl)<K.houseW*K.houseD) continue;
      const bc=centroid(pcl);
      fillParcel(pcl,K,ok,rng,streets,buildings, patN(bc[0]*0.05,bc[1]*0.05)*0.5+0.5);
    }
  }
  const clear=roads.map(r=>({pts:r.pts,half:r.tier/2+1.5}));
  const kept=[];for(const b of buildings){const c=centroid(b.poly);let hit=false;for(const cp of clear)if(distToPath(c,cp.pts)<cp.half){hit=true;break;}if(!hit)kept.push(b);}
  return {roads,streets,buildings:kept,greenCells,gates:anchors.map(a=>rp(a,last)),cita};
}

// ---- draw to canvas
function draw(lvl,geo,file){
  const [x0,y0,x1,y1]=bbox(lvl.boundary),pad=20;
  const W=x1-x0+pad*2,H=y1-y0+pad*2,S=1.1,cw=Math.round(W*S),ch=Math.round(H*S);
  const cv=createCanvas(cw,ch),g=cv.getContext('2d');
  g.setTransform(S,0,0,S,-((x0-pad)*S),-((y0-pad)*S));
  g.fillStyle='#e9dcbf';g.fillRect(x0-pad,y0-pad,W,H);
  const path=p=>{g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.closePath();};
  const line=p=>{g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);};
  path(lvl.boundary);g.fillStyle='#e3d2aa';g.fill();
  g.save();path(lvl.boundary);g.clip();
  for(const cell of geo.greenCells){path(cell);g.fillStyle='rgba(169,184,132,0.55)';g.fill();}
  g.strokeStyle='#5d4a2f';g.lineCap='round';g.lineJoin='round';
  for(const s of geo.streets){g.globalAlpha=s.tier>=3?0.55:0.42;g.lineWidth=s.tier>=3?2:1.4;line(s.pts);g.stroke();}
  g.globalAlpha=1;
  for(const b of geo.buildings){path(b.poly);g.fillStyle='#c8a066';g.fill();g.lineWidth=0.5;g.strokeStyle='#3f2f1a';g.stroke();}
  g.strokeStyle='#5d4a2f';
  for(const r of geo.roads){line(r.pts);g.lineWidth=r.tier;g.globalAlpha=r.tier>=5?0.9:0.8;g.stroke();}
  g.globalAlpha=1;
  if(geo.cita){path(geo.cita);g.fillStyle='#9a5a3c';g.fill();g.lineWidth=1.4;g.strokeStyle='#3f2f1a';g.stroke();}
  g.restore();
  path(lvl.boundary);g.lineWidth=3;g.strokeStyle='#3f2f1a';g.stroke();
  writeFileSync(file,cv.toBuffer('image/png'));
  console.log(file,'buildings',geo.buildings.length,'green',geo.greenCells.length,'streets',geo.streets.length);
}

function drawCrop(lvl,geo,file,box){
  const [cx0,cy0,cx1,cy1]=box, W=cx1-cx0,H=cy1-cy0,S=3,cw=Math.round(W*S),ch=Math.round(H*S);
  const cv=createCanvas(cw,ch),g=cv.getContext('2d');
  g.setTransform(S,0,0,S,-cx0*S,-cy0*S);
  g.fillStyle='#e3d2aa';g.fillRect(cx0,cy0,W,H);
  const path=p=>{g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.closePath();};
  const line=p=>{g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);};
  for(const cell of geo.greenCells){path(cell);g.fillStyle='rgba(169,184,132,0.55)';g.fill();}
  g.strokeStyle='#5d4a2f';g.lineCap='round';g.lineJoin='round';
  for(const s of geo.streets){g.globalAlpha=s.tier>=3?0.55:0.42;g.lineWidth=s.tier>=3?2:1.4;line(s.pts);g.stroke();}
  g.globalAlpha=1;
  for(const b of geo.buildings){path(b.poly);g.fillStyle='#c8a066';g.fill();g.lineWidth=0.5;g.strokeStyle='#3f2f1a';g.stroke();}
  g.strokeStyle='#5d4a2f';for(const r of geo.roads){line(r.pts);g.lineWidth=r.tier;g.globalAlpha=r.tier>=5?0.9:0.8;g.stroke();}
  writeFileSync(file,cv.toBuffer('image/png'));
  console.log('crop',file);
}
const cfg={rings:3,gates:8,irr:.5,den:.6,green:0,ter:.24};
const gL0=generate(LEVELS.L0,cfg,hashSeed('L0|1'));
draw(LEVELS.L0, gL0, process.env.TEMP+'/look_L0.png');
drawCrop(LEVELS.L0, gL0, process.env.TEMP+'/crop_TL.png', [360,430,760,760]);
drawCrop(LEVELS.L0, gL0, process.env.TEMP+'/crop_R.png', [700,470,1080,800]);
