import * as THREE from 'three';

// ---------- deterministic rng ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let rnd = mulberry32(1234);
const R = (a=0,b=1)=>a+(b-a)*rnd();
const RN = ()=> (rnd()+rnd()+rnd()+rnd()-2)/2; // approx normal-ish (-1..1)

// ---------- GLSL ----------
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
 const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
 vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
 vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
 vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
 i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
 float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);
 vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
 vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
 vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
 vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
 vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
 vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
 return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float fbm(vec3 p){float f=0.0;float a=0.5;for(int i=0;i<3;i++){f+=a*snoise(p);p*=2.1;a*=0.5;}return f;}
`;

const VERT = `
uniform float dispAmp; uniform float dispFreq;
varying vec3 vWorldPos; varying vec3 vNormal; varying vec3 vLocal;
${NOISE}
void main(){
  #ifdef USE_INSTANCING
    mat4 m = modelMatrix * instanceMatrix;
  #else
    mat4 m = modelMatrix;
  #endif
  vec4 wp = m * vec4(position,1.0);
  vec3 n = normalize(mat3(m) * normal);
  float d = fbm(wp.xyz * dispFreq) * dispAmp;
  wp.xyz += n * d;
  vWorldPos = wp.xyz; vNormal = n; vLocal = position;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// SEM: secondary-electron look. Edge brightening (yield ~ 1/cos), off-axis detector term, crevice darkening.
const SEM_FRAG = `
uniform vec3 tint; uniform vec3 dark; uniform vec3 highlight;
uniform vec3 detector; uniform float bumpAmp; uniform float bumpFreq; uniform float bumpAmp2; uniform float bumpFreq2;
uniform vec2 aoY; uniform float aoMin; uniform float edgeGain; uniform float edgePow; uniform float gainMul;
varying vec3 vWorldPos; varying vec3 vNormal; varying vec3 vLocal;
${NOISE}
float tex2(vec3 p){ return snoise(p) + 0.5*snoise(vec3(p.y*1.9+3.1, p.z*2.1-1.7, p.x*2.0+5.3)); }
vec3 grad(vec3 p,float f){float e=0.006;float n0=tex2(p*f);
 return vec3(tex2((p+vec3(e,0,0))*f)-n0,tex2((p+vec3(0,e,0))*f)-n0,tex2((p+vec3(0,0,e))*f)-n0)/e;}
void main(){
  vec3 N = normalize(vNormal);
  vec3 g = grad(vWorldPos,bumpFreq)*bumpAmp + grad(vWorldPos+vec3(7.1),bumpFreq2)*bumpAmp2;
  g -= N*dot(g,N);
  N = normalize(N - g*0.012);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndv = clamp(dot(N,V),0.0,1.0);
  float edge = pow(1.0-ndv, edgePow);
  float lamb = clamp(dot(N,normalize(detector)),0.0,1.0);
  float ao = mix(aoMin,1.0,smoothstep(aoY.x,aoY.y,vWorldPos.y));
  float sem = (0.10 + 0.48*lamb + edgeGain*edge) * ao * gainMul;
  float k = clamp(sem,0.0,1.4);
  vec3 col = k<0.55 ? mix(dark,tint,k/0.55) : mix(tint,highlight,clamp((k-0.55)/0.6,0.0,1.0));
  gl_FragColor = vec4(col,1.0);
}`;

// Confocal: emissive, additive; 'fill' lights the body, 'edge' lights the membrane silhouette
const CONF_FRAG = `
uniform vec3 tint; uniform float fill; uniform float edgeGain; uniform float edgePow; uniform float bumpAmp; uniform float bumpFreq;
uniform float bumpAmp2; uniform float bumpFreq2; uniform vec2 aoY; uniform float aoMin; uniform float gainMul; uniform vec3 detector; uniform vec3 dark; uniform vec3 highlight;
varying vec3 vWorldPos; varying vec3 vNormal; varying vec3 vLocal;
${NOISE}
void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndv = clamp(dot(N,V),0.0,1.0);
  float edge = pow(1.0-ndv, edgePow);
  float tex = 1.0 - bumpAmp*0.5 + bumpAmp*0.5*fbm(vWorldPos*bumpFreq);
  float vol = mix(1.0, pow(ndv,0.6), fill>0.0?0.75:0.0);
  float i = (fill*tex*vol + edgeGain*edge) * gainMul;
  gl_FragColor = vec4(tint*i, 1.0);
}`;

function mat(opts){
  const o = Object.assign({
    mode:'sem', tint:'#c9b79c', dark:'#221b17', highlight:'#f4ede0',
    detector:[-0.6,0.8,0.5], bumpAmp:1.0, bumpFreq:40, bumpAmp2:0.6, bumpFreq2:9,
    aoY:[-1,-0.5], aoMin:1, edgeGain:0.75, edgePow:2.2, gainMul:1, dispAmp:0.0, dispFreq:6, fill:0.5,
    blending:THREE.NormalBlending, transparent:false, depthWrite:true,
  }, opts);
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: o.mode==='sem'?SEM_FRAG:CONF_FRAG,
    uniforms: {
      tint:{value:new THREE.Color(o.tint)}, dark:{value:new THREE.Color(o.dark)}, highlight:{value:new THREE.Color(o.highlight)},
      detector:{value:new THREE.Vector3(...o.detector)}, bumpAmp:{value:o.bumpAmp}, bumpFreq:{value:o.bumpFreq},
      bumpAmp2:{value:o.bumpAmp2}, bumpFreq2:{value:o.bumpFreq2}, aoY:{value:new THREE.Vector2(...o.aoY)}, aoMin:{value:o.aoMin},
      edgeGain:{value:o.edgeGain}, edgePow:{value:o.edgePow}, gainMul:{value:o.gainMul}, dispAmp:{value:o.dispAmp}, dispFreq:{value:o.dispFreq}, fill:{value:o.fill},
    },
    blending:o.blending, transparent:o.transparent, depthWrite:o.depthWrite, side:THREE.FrontSide,
  });
}

// ---------- geometry ----------
// rod: hemispherical caps, optional septum (dividing cell), optional bend. y axis = long axis.
function rodGeo({r=0.4,len=2,capSeg=12,bodySeg=40,radSeg=40,septum=0,septumW=0.25,bend=0,taper=0}={}){
  const pts=[];
  for(let i=0;i<=capSeg;i++){const a=-Math.PI/2+(i/capSeg)*(Math.PI/2);pts.push(new THREE.Vector2(r*Math.cos(a),-len/2+r*Math.sin(a)));}
  for(let i=1;i<bodySeg;i++){const y=-len/2+(i/bodySeg)*len;let rr=r*(1-taper*(y/len+0.5)*0.5);
    if(septum>0){rr*=1-septum*Math.exp(-(y*y)/(septumW*septumW));}
    pts.push(new THREE.Vector2(rr,y));}
  for(let i=0;i<=capSeg;i++){const a=(i/capSeg)*(Math.PI/2);pts.push(new THREE.Vector2(r*Math.cos(a)*(1-taper*0.5),len/2+r*Math.sin(a)));}
  const g=new THREE.LatheGeometry(pts,radSeg);
  if(bend!==0){const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)+bend*y*y);}g.computeVertexNormals();}
  return g;
}
function tubeAlong(points,radius,segs=48){
  const curve=new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve,segs,radius,8,false);
}
function aim(obj,dir){const y=new THREE.Vector3(...dir).normalize(); const up=new THREE.Vector3(0,1,0); let x=new THREE.Vector3().crossVectors(up,y); if(x.lengthSq()<1e-6)x.set(1,0,0); x.normalize(); const z=new THREE.Vector3().crossVectors(x,y); obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));}
function placeRod(mesh,pos,yaw,pitch,roll=0){
  mesh.position.set(...pos);
  mesh.rotation.set(0,0,0);
  mesh.rotateY(yaw); mesh.rotateZ(Math.PI/2+pitch); mesh.rotateY(roll); // lay along ground
}
// Bifidobacterium: rod with two short diverging branches at one pole ("bifid")
function bifid(material,{r=0.38,len=2.6,branch=1.2,spread=0.62}={}){
  const g=new THREE.Group();
  const main=new THREE.Mesh(rodGeo({r,len,bend:R(-0.03,0.03),taper:0.1}),material); g.add(main);
  for(const s of [-1,1]){
    const bl=branch+0.4;
    const b=new THREE.Mesh(rodGeo({r:r*0.72,len:bl,taper:0.35}),material);
    // branch starts inside the pole and diverges in the rod's local x/y plane
    b.position.set(s*Math.sin(spread)*(bl*0.5-0.15),len/2-0.35+Math.cos(spread)*(bl*0.5-0.15),0);
    b.rotation.z=-s*spread; g.add(b);
  }
  return g;
}


// ---------- scenes ----------
const params=new URLSearchParams(location.search);
const SCENE=params.get('scene')||'1';
const SS=2; const W=innerWidth*SS,H=innerHeight*SS; const OW=innerWidth,OH=innerHeight; const K=W/1600;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setSize(OW,OH); renderer.setPixelRatio(1); document.body.appendChild(renderer.domElement);
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.NoToneMapping;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(32,W/H,0.05,200);
let post={focus:5,aperture:0.02,maxblur:0.012,bloom:null,grain:0.05,vignette:0.45,contrast:1.06,lift:0,scan:0,shot:0};

function epithelialHeight(x,z){ // gentle cell domes (~8 µm cells) + fine undulation
  const cx=Math.round(x/8),cz=Math.round(z/8);
  const dx=x-cx*8-Math.sin(cx*3.1+cz*1.7)*1.2,dz=z-cz*8-Math.cos(cx*1.3+cz*2.9)*1.2;
  return 0.35*Math.exp(-(dx*dx+dz*dz)/28)+0.08*Math.sin(x*1.3)*Math.cos(z*1.1);
}

function scene1(){ // Intersections: Bifidobacterium and Lactobacillus on the microvillus brush border, colorized SEM
  rnd=mulberry32(77);
  scene.background=new THREE.Color('#171210');
  const mvMat=mat({tint:'#c9b89c',dark:'#1d1613',highlight:'#f5eee0',aoY:[-0.05,1.05],aoMin:0.3,gainMul:1.2,bumpAmp:0.25,bumpFreq:30,bumpAmp2:0.35,bumpFreq2:8,edgeGain:0.7,edgePow:2.6,dispAmp:0.006,dispFreq:9});
  // microvilli: ~0.1 µm diameter, ~1 µm tall, brush-border packed (~0.2 µm pitch)
  const mvGeo=rodGeo({r:0.055,len:1.0,capSeg:6,bodySeg:6,radSeg:12,taper:0.1});
  const field=26, pitch=0.19; const n=Math.floor(field/pitch);
  const mv=new THREE.InstancedMesh(mvGeo,mvMat,n*n);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),s=new THREE.Vector3(1,1,1),p=new THREE.Vector3();
  let k=0;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    const x=-field/2+i*pitch+R(-0.05,0.05),z=-field/2+j*pitch+R(-0.05,0.05);
    const h=epithelialHeight(x,z); const lenv=R(0.85,1.15);
    p.set(x,h+0.5*lenv,z); e.set(RN()*0.18,R(0,6.28),RN()*0.18); q.setFromEuler(e); s.set(1,lenv,1);
    m.compose(p,q,s); mv.setMatrixAt(k++,m);
  }
  mv.count=k; scene.add(mv);
  // epithelial base under the brush border (visible only in gaps)
  const base=new THREE.Mesh(new THREE.PlaneGeometry(field,field,64,64),mat({tint:'#6d5d4d',dark:'#15100e',highlight:'#9b8a76',aoMin:1,bumpAmp:0.3,bumpFreq:10}));
  base.rotation.x=-Math.PI/2; { const pa=base.geometry.attributes.position; for(let i=0;i<pa.count;i++){pa.setZ(i,epithelialHeight(pa.getX(i),-pa.getY(i)));} base.geometry.computeVertexNormals(); }
  scene.add(base);

  const bMat=mat({tint:'#ad7860',dark:'#2b1d17',highlight:'#f6e4d3',aoY:[0.6,1.5],aoMin:0.5,gainMul:1.25,bumpAmp:0.35,bumpFreq:26,bumpAmp2:0.9,bumpFreq2:4,edgeGain:0.8,edgePow:2.4,dispAmp:0.02,dispFreq:4});
  const lMat=mat({tint:'#a67a66',dark:'#2b1d17',highlight:'#f4e2d2',aoY:[0.6,1.5],aoMin:0.5,gainMul:1.25,bumpAmp:0.3,bumpFreq:26,bumpAmp2:0.5,bumpFreq2:5,edgeGain:0.8,edgePow:2.4,dispAmp:0.01,dispFreq:5});
  const top=(x,z)=>epithelialHeight(x,z)+1.0;
  // hero Bifidobacterium (bifid pole toward camera-left), resting on microvillus tips
  const hero=bifid(bMat,{r:0.4,len:2.7,branch:1.0,spread:0.48});
  hero.position.set(-0.4,top(-0.4,0.3)+0.42,0.3); aim(hero,[0.9,0.0,0.45]); scene.add(hero);
  // second, partially dividing, further back; third at the edge
  const b2=bifid(bMat,{r:0.36,len:2.3,branch:0.8,spread:0.42}); b2.position.set(3.4,top(3.4,-2.6)+0.38,-2.6); aim(b2,[-0.6,0.03,0.8]); scene.add(b2);
  const b3=bifid(bMat,{r:0.38,len:2.9,branch:0.9,spread:0.5}); b3.position.set(-4.6,top(-4.6,1.6)+0.4,1.6); aim(b3,[0.35,0.02,-0.94]); scene.add(b3);
  // Lactobacillus chain: 0.8 x 3 µm rods end to end, slight kinks, septa at the joins
  let cx=-7.5,cz=-3.8,ang=0.12;
  for(let i=0;i<4;i++){
    const len=R(2.6,3.4); const rod=new THREE.Mesh(rodGeo({r:0.38,len,septum:i%2?0.22:0,septumW:0.3,bend:R(-0.02,0.02)}),lMat);
    const mx=cx+Math.cos(ang)*len/2, mz=cz+Math.sin(ang)*len/2;
    rod.position.set(mx,top(mx,mz)+0.4,mz); aim(rod,[Math.cos(ang),0,Math.sin(ang)]); scene.add(rod);
    cx+=Math.cos(ang)*(len+0.06); cz+=Math.sin(ang)*(len+0.06); ang+=R(-0.25,0.25);
  }
  // mucus strands: dehydrated mucin nets seen in fixed SEM preps, draped over the brush border
  const muMat=mat({tint:'#d9cfbf',dark:'#2a2420',highlight:'#f7f2e8',aoMin:1,bumpAmp:0.5,bumpFreq:50,edgeGain:0.9,edgePow:2.0});
  for(let i=0;i<22;i++){
    const pts=[]; let x=R(-9,9),z=R(-9,9),a=R(0,6.28); const L=Math.floor(R(4,9));
    for(let j=0;j<L;j++){pts.push(new THREE.Vector3(x,top(x,z)+R(0.02,0.25),z)); a+=R(-0.9,0.9); x+=Math.cos(a)*R(0.4,1.0); z+=Math.sin(a)*R(0.4,1.0);}
    scene.add(new THREE.Mesh(tubeAlong(pts,R(0.02,0.05),40),muMat));
  }
  camera.position.set(0.5,6.2,4.2); camera.lookAt(0.2,1.0,0.1);
  post={focus:camera.position.distanceTo(new THREE.Vector3(0.2,1.45,0.5)),aperture:80,maxCoC:34,ao:{radius:0.35,strength:0.85},bloom:null,grain:0.05,vignette:0.5,contrast:1.12,lift:-0.01,scan:1,shot:0};
}

function scene2(){ // Populations: biofilm of short rods (Bacteroides-like) in an EPS matrix, monochrome SEM
  rnd=mulberry32(19);
  scene.background=new THREE.Color('#0d0d0d');
  const sub=new THREE.Mesh(new THREE.PlaneGeometry(40,40,80,80),mat({tint:'#4d4a46',dark:'#0a0a0a',highlight:'#8c8883',aoMin:1,bumpAmp:0.9,bumpFreq:5,bumpAmp2:0.35,bumpFreq2:18,edgeGain:0.3}));
  sub.rotation.x=-Math.PI/2; { const pa=sub.geometry.attributes.position; for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i);pa.setZ(i,0.25*Math.sin(x*0.7)*Math.cos(y*0.5)+0.1*Math.sin(x*2.3+y*1.7));} sub.geometry.computeVertexNormals(); }
  scene.add(sub);
  const cMat=mat({tint:'#b6b3ad',dark:'#101010',highlight:'#f5f3ee',aoY:[0.05,0.9],aoMin:0.45,gainMul:1.2,bumpAmp:0.3,bumpFreq:26,bumpAmp2:0.5,bumpFreq2:5,edgeGain:0.85,edgePow:2.2,dispAmp:0.014,dispFreq:4});
  const epsMat=mat({tint:'#a8a49d',dark:'#141414',highlight:'#efece6',aoMin:1,bumpAmp:0.4,bumpFreq:60,edgeGain:1.0,edgePow:1.8});
  // pack rods on the substrate, two loose clusters, occasional second layer
  const cells=[];
  function ptSeg(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az;const t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz)));return Math.hypot(px-ax-t*dx,pz-az-t*dz);}
  function segSeg(a,b){ // min distance between the two rod axes (body only, caps handled by radius)
    const ha=(a.len-2*a.r)/2, hb=(b.len-2*b.r)/2;
    const a0=[a.x-Math.cos(a.a)*ha,a.z-Math.sin(a.a)*ha],a1=[a.x+Math.cos(a.a)*ha,a.z+Math.sin(a.a)*ha];
    const b0=[b.x-Math.cos(b.a)*hb,b.z-Math.sin(b.a)*hb],b1=[b.x+Math.cos(b.a)*hb,b.z+Math.sin(b.a)*hb];
    let m=1e9; for(let i=0;i<=6;i++){const u=i/6; m=Math.min(m,ptSeg(a0[0]+(a1[0]-a0[0])*u,a0[1]+(a1[1]-a0[1])*u,b0[0],b0[1],b1[0],b1[1]),ptSeg(b0[0]+(b1[0]-b0[0])*u,b0[1]+(b1[1]-b0[1])*u,a0[0],a0[1],a1[0],a1[1]));}
    return m;
  }
  function tryPlace(cx,cz,spread,layer,alignA){
    for(let t=0;t<120;t++){
      const x=cx+RN()*spread,z=cz+RN()*spread,a=(alignA!==undefined?alignA+RN()*0.5:R(0,6.28)),len=R(1.6,2.7),r=R(0.32,0.42);
      const cand={x,z,a,len,r,layer}; let ok=true;
      for(const c of cells){ if(c.layer!==layer)continue; if(segSeg(cand,c)<r+c.r+0.02){ok=false;break;} }
      if(ok){cells.push(cand);return true;}
    }
    return false;
  }
  // colonies show local alignment (nematic order) from growth and division; two domains with different alignment
  for(let i=0;i<900;i++)tryPlace(0.3,0.2,5.2,0, (RN()>0? 0.4:2.1));
  for(let i=0;i<300;i++)tryPlace(-6.0,-3.5,3.2,0, 1.3);
  for(let i=0;i<300;i++)tryPlace(6.0,3.5,3.2,0, -0.4);
  for(let i=0;i<200;i++)tryPlace(0.4,0.3,3.0,1, 0.6);
  for(const c of cells){
    const div=rnd()<0.28; const rod=new THREE.Mesh(rodGeo({r:c.r,len:c.len,septum:div?R(0.15,0.35):0,septumW:0.22,bend:R(-0.03,0.03)}),cMat);
    const y=c.layer===0?c.r+0.05+RN()*0.03:c.r*3+0.05;
    rod.position.set(c.x,y,c.z); aim(rod,[Math.cos(c.a),RN()*0.12,Math.sin(c.a)]); c.y=y; scene.add(rod);
  }
  // EPS strands: between near neighbours, sagging; plus tethers to the substrate
  let strands=0;
  for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++){
    const a=cells[i],b=cells[j]; const d=Math.hypot(a.x-b.x,a.z-b.z);
    if(d<2.3&&rnd()<0.45){
      const pts=[]; const N=4; for(let t=0;t<=N;t++){const u=t/N; const sag=-0.25*Math.sin(u*Math.PI)*R(0.6,1.4); pts.push(new THREE.Vector3(a.x+(b.x-a.x)*u+RN()*0.08,a.y+(b.y-a.y)*u+sag+0.15,a.z+(b.z-a.z)*u+RN()*0.08));}
      scene.add(new THREE.Mesh(tubeAlong(pts,R(0.025,0.06),24),epsMat)); strands++;
    }
  }
  for(const c of cells){ if(rnd()<0.5){ const ang=R(0,6.28),L=R(0.5,1.3); const pts=[new THREE.Vector3(c.x,c.y+0.1,c.z),new THREE.Vector3(c.x+Math.cos(ang)*L*0.5,c.y*0.5,c.z+Math.sin(ang)*L*0.5),new THREE.Vector3(c.x+Math.cos(ang)*L,0.02,c.z+Math.sin(ang)*L)]; scene.add(new THREE.Mesh(tubeAlong(pts,0.025,16),epsMat)); } }
  console.log('cells',cells.length,'strands',strands);
  camera.position.set(1.8,5.2,7.2); camera.lookAt(0.2,0.3,0.2);
  post={focus:camera.position.distanceTo(new THREE.Vector3(0.6,0.4,0.6)),aperture:55,maxCoC:30,ao:{radius:0.5,strength:1.0},bloom:null,grain:0.065,vignette:0.55,contrast:1.14,lift:0,scan:1,shot:0};
}

function scene3(){ // Surfaces: confocal fluorescence, colonic epithelium + mucus + FISH-labelled bacteria
  rnd=mulberry32(5);
  scene.background=new THREE.Color('#000000');
  const add={blending:THREE.AdditiveBlending,transparent:true,depthWrite:false};
  // epithelial cells: ~8 µm wide, hex-ish packed, membrane stain (grey-cyan), nuclei (DAPI blue)
  const memMat=mat(Object.assign({mode:'confocal',tint:'#8fc4c4',fill:0.05,edgeGain:1.3,edgePow:5.0,bumpFreq:0.9},add));
  const nucMat=mat(Object.assign({mode:'confocal',tint:'#4a6cf0',fill:0.75,edgeGain:0.0,edgePow:2.0,bumpAmp:0.9,bumpFreq:1.4},add));
  // hexagonally packed columnar cells (~8 µm apical width): apical junctions (ZO-1 style stain) read as a honeycomb from above
  const hexR=4.3; const junMat=mat(Object.assign({mode:'confocal',tint:'#9fd3d0',fill:0.75,edgeGain:0.0,edgePow:2.0,bumpAmp:0.7,bumpFreq:1.4},add));
  const nucGeo=new THREE.SphereGeometry(1,32,24);
  const edgeGeo=new THREE.CylinderGeometry(0.22,0.22,hexR,6,1); edgeGeo.rotateZ(Math.PI/2);
  const seen=new Set(); const vj=new Map();
  const vtx=(px,pz)=>{ const key=px.toFixed(1)+','+pz.toFixed(1); if(!vj.has(key)){ vj.set(key,[px+RN()*1.1,pz+RN()*1.1]); } return vj.get(key); }; // shared, jittered vertices -> irregular 5-7 sided cells
  for(let i=-7;i<=7;i++)for(let j=-7;j<=7;j++){
    const x=i*hexR*Math.sqrt(3)+(j%2?hexR*Math.sqrt(3)/2:0), z=j*hexR*1.5;
    for(let k=0;k<6;k++){ // hex edges, deduplicated by midpoint
      const a0=Math.PI/6+k*Math.PI/3, a1=a0+Math.PI/3;
      const p0=vtx(x+hexR*Math.cos(a0),z+hexR*Math.sin(a0)), p1=vtx(x+hexR*Math.cos(a1),z+hexR*Math.sin(a1));
      const key=((p0[0]+p1[0])/2).toFixed(1)+','+((p0[1]+p1[1])/2).toFixed(1); if(seen.has(key))continue; seen.add(key);
      const e=new THREE.Mesh(edgeGeo,junMat); e.position.set((p0[0]+p1[0])/2,0.15+RN()*0.15,(p0[1]+p1[1])/2); e.rotation.y=-Math.atan2(p1[1]-p0[1],p1[0]-p0[0]); e.scale.x=Math.hypot(p1[0]-p0[0],p1[1]-p0[1])/hexR; scene.add(e);
    }
    const nu=new THREE.Mesh(nucGeo,nucMat); nu.position.set(x+RN()*0.9,-1.5,z+RN()*0.9); nu.scale.set(R(1.9,2.4),1.4,R(1.9,2.4)); nu.rotation.y=R(0,3); scene.add(nu);
  }
  // mucus: Muc2 (magenta) soft haze, denser near the epithelium, thinning outward
  const cv=document.createElement('canvas'); cv.width=cv.height=64; const ctx=cv.getContext('2d');
  const gr=ctx.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.5,'rgba(255,255,255,0.25)'); gr.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gr; ctx.fillRect(0,0,64,64); const tex=new THREE.CanvasTexture(cv);
  const mp=[]; for(let i=0;i<6000;i++){ const y=0.6+Math.pow(rnd(),1.6)*8; mp.push(R(-30,30),y,R(-30,30)); }
  const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.Float32BufferAttribute(mp,3));
  scene.add(new THREE.Points(pg,new THREE.PointsMaterial({map:tex,color:new THREE.Color('#8a3a80'),size:2.8,transparent:true,opacity:0.2,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true})));
  // bacteria: general eubacteria probe (green) in outer mucus; Akkermansia-like ovals (amber) in the inner mucus, near the cells
  const gMat=mat(Object.assign({mode:'confocal',tint:'#86e57f',fill:1.0,edgeGain:0.15,edgePow:2.0,bumpAmp:0.6,bumpFreq:2.5},add));
  const aMat=mat(Object.assign({mode:'confocal',tint:'#f2a640',fill:1.0,edgeGain:0.15,edgePow:2.0,bumpAmp:0.6,bumpFreq:2.5},add));
  const clusters=[]; for(let i=0;i<14;i++)clusters.push([R(-26,26),R(-26,26),R(3,6)]);
  for(let i=0;i<230;i++){ const len=R(1.4,3.2),r=R(0.28,0.42); const rod=new THREE.Mesh(rodGeo({r,len,capSeg:6,bodySeg:8,radSeg:16,bend:R(-0.03,0.03)}),gMat);
    const cl=clusters[Math.floor(rnd()*clusters.length)]; const inC=rnd()<0.7;
    rod.position.set(inC?cl[0]+RN()*cl[2]:R(-26,26),1.5+Math.pow(rnd(),0.8)*5.0,inC?cl[1]+RN()*cl[2]:R(-26,26)); rod.rotation.set(RN()*0.5,R(0,6.28),Math.PI/2+RN()*0.6); scene.add(rod); }
  for(let i=0;i<70;i++){ const rod=new THREE.Mesh(rodGeo({r:R(0.36,0.46),len:R(0.9,1.3),capSeg:6,bodySeg:6,radSeg:16}),aMat);
    rod.position.set(R(-26,26),R(0.6,2.4),R(-26,26)); rod.rotation.set(RN()*0.5,R(0,6.28),Math.PI/2+RN()*0.6); scene.add(rod); }
  camera.position.set(3,30,11); camera.lookAt(0,0.5,-3);
  post={focus:camera.position.distanceTo(new THREE.Vector3(0,0.8,-3)),aperture:13*K,maxCoC:18*K,ao:null,bloom:{strength:0.55,threshold:0.3},grain:0.015,vignette:0.35,contrast:1.06,lift:0.0,scan:0,shot:0.8};
}

const __t0=performance.now(); ({1:scene1,2:scene2,3:scene3})[SCENE]();


// ---------- custom post pipeline: scene -> (SSAO) -> DOF gather -> (bloom) -> downsample+grain ----------
const FSV=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.0,1.0);}`;
const quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const quadScene=new THREE.Scene(); const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),null); quadScene.add(quad);
function fs(target,material){quad.material=material;renderer.setRenderTarget(target);renderer.render(quadScene,quadCam);}
function rt(w,h,depth){const t=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
  if(depth){t.depthTexture=new THREE.DepthTexture(w,h,THREE.UnsignedIntType);} return t;}
const sceneRT=rt(W,H,true);
renderer.setRenderTarget(sceneRT); renderer.render(scene,camera);
const invProj=camera.projectionMatrixInverse.clone();
const DEPTHFN=`uniform sampler2D tDepth; uniform mat4 invProj; uniform vec2 res;
 vec3 viewPos(vec2 uv){ float d=texture2D(tDepth,uv).r; vec4 p=invProj*vec4(uv*2.0-1.0,d*2.0-1.0,1.0); return p.xyz/p.w; }`;
// SSAO (depth only)
let aoTex=null;
if(post.ao){
  const kern=[]; for(let i=0;i<16;i++){ let v=new THREE.Vector3(R(-1,1),R(-1,1),R(0.15,1)).normalize(); let s=(i+1)/16; v.multiplyScalar(0.1+0.9*s*s); kern.push(v);}
  const aoRT=rt(W/2,H/2,false), aoRT2=rt(W/2,H/2,false);
  const aoMat=new THREE.ShaderMaterial({vertexShader:FSV,fragmentShader:`${DEPTHFN} uniform float radius; uniform vec3 kern[16]; uniform mat4 proj; varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){ vec3 P=viewPos(vUv); if(P.z<-150.0){gl_FragColor=vec4(1.0);return;}
      vec2 px=1.0/res; vec3 Pr=viewPos(vUv+vec2(px.x,0.0)),Pl=viewPos(vUv-vec2(px.x,0.0)),Pu=viewPos(vUv+vec2(0.0,px.y)),Pd=viewPos(vUv-vec2(0.0,px.y));
      vec3 dx=(abs(Pr.z-P.z)<abs(Pl.z-P.z))?Pr-P:P-Pl; vec3 dy=(abs(Pu.z-P.z)<abs(Pd.z-P.z))?Pu-P:P-Pd;
      vec3 N=normalize(cross(dx,dy)); if(N.z<0.0)N=-N;
      float a=hash(vUv*res)*6.2831; vec3 rv=vec3(cos(a),sin(a),0.0);
      vec3 T=normalize(rv-N*dot(rv,N)); vec3 B=cross(N,T); mat3 tbn=mat3(T,B,N);
      float occ=0.0;
      for(int i=0;i<16;i++){ vec3 s=P+tbn*kern[i]*radius; vec4 o=proj*vec4(s,1.0); o.xyz/=o.w; vec2 suv=o.xy*0.5+0.5;
        float sz=viewPos(suv).z; float rc=smoothstep(0.0,1.0,radius/abs(P.z-sz)); occ+=(sz>=s.z+0.02*radius?1.0:0.0)*rc; }
      gl_FragColor=vec4(vec3(1.0-occ/16.0),1.0); }`,
    uniforms:{tDepth:{value:sceneRT.depthTexture},invProj:{value:invProj},proj:{value:camera.projectionMatrix},res:{value:new THREE.Vector2(W/2,H/2)},radius:{value:post.ao.radius},kern:{value:kern}}});
  fs(aoRT,aoMat);
  const blurMat=new THREE.ShaderMaterial({vertexShader:FSV,fragmentShader:`${DEPTHFN} uniform sampler2D tex; uniform vec2 px; varying vec2 vUv; void main(){ float z0=viewPos(vUv).z; float s=0.0,ws=0.0; for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++){ vec2 uv=vUv+vec2(float(i),float(j))*px; float w=exp(-abs(viewPos(uv).z-z0)*6.0); s+=texture2D(tex,uv).r*w; ws+=w;} gl_FragColor=vec4(vec3(s/ws),1.0); }`,
    uniforms:{tex:{value:aoRT.texture},px:{value:new THREE.Vector2(2/W,2/H)},tDepth:{value:sceneRT.depthTexture},invProj:{value:invProj},res:{value:new THREE.Vector2(W/2,H/2)}}});
  fs(aoRT2,blurMat); aoTex=aoRT2.texture;
}
// DOF gather (scatter-as-gather), applies AO
const dofRT=rt(W,H,false);
const dofMat=new THREE.ShaderMaterial({vertexShader:FSV,fragmentShader:`${DEPTHFN} uniform sampler2D tColor; uniform sampler2D tAO; uniform float useAO, aoStrength; uniform float focus, aperture, maxCoC; varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float coc(vec2 uv){ float z=-viewPos(uv).z; return clamp(aperture*abs(1.0-focus/z),0.0,maxCoC); }
  vec3 col(vec2 uv){ vec3 c=texture2D(tColor,uv).rgb; if(useAO>0.5){ float a=texture2D(tAO,uv).r; c*=mix(1.0,a,aoStrength);} return c; }
  void main(){
    float c0=coc(vUv); vec3 acc=col(vUv); float wsum=1.0;
    float rot=hash(vUv*res)*6.2831; const int N=40; float gold=2.39996;
    for(int i=1;i<=N;i++){ float r=sqrt(float(i)/float(N))*maxCoC; float a=float(i)*gold+rot; vec2 off=vec2(cos(a),sin(a))*r;
      vec2 suv=vUv+off/res; float cs=coc(suv); float w=smoothstep(r-1.5,r+1.5,max(cs,c0*0.0+cs)); 
      // a sample contributes if its own circle of confusion reaches this pixel; near-focus pixels also gather from own coc
      w=max(w,smoothstep(r-1.5,r+1.5,c0)*step(cs,c0+2.0));
      acc+=col(suv)*w; wsum+=w; }
    gl_FragColor=vec4(acc/wsum,1.0); }`,
  uniforms:{tDepth:{value:sceneRT.depthTexture},invProj:{value:invProj},res:{value:new THREE.Vector2(W,H)},tColor:{value:sceneRT.texture},tAO:{value:aoTex},useAO:{value:aoTex?1:0},aoStrength:{value:post.ao?post.ao.strength:0},focus:{value:post.focus},aperture:{value:post.aperture},maxCoC:{value:post.maxCoC}}});
fs(dofRT,dofMat);
// bloom (confocal glow)
let bloomTex=null;
if(post.bloom){
  const b1=rt(W/4,H/4,false), b2=rt(W/4,H/4,false);
  fs(b1,new THREE.ShaderMaterial({vertexShader:FSV,fragmentShader:`uniform sampler2D tex; uniform float th; varying vec2 vUv; void main(){ vec3 c=texture2D(tex,vUv).rgb; float l=dot(c,vec3(0.3,0.59,0.11)); gl_FragColor=vec4(c*smoothstep(th,th+0.3,l),1.0);}`,uniforms:{tex:{value:dofRT.texture},th:{value:post.bloom.threshold}}}));
  const g=(src,dst,dir)=>fs(dst,new THREE.ShaderMaterial({vertexShader:FSV,fragmentShader:`uniform sampler2D tex; uniform vec2 d; varying vec2 vUv; void main(){ vec3 s=vec3(0.0); float ws=0.0; for(int i=-12;i<=12;i++){ float w=exp(-float(i*i)/50.0); s+=texture2D(tex,vUv+d*float(i)).rgb*w; ws+=w;} gl_FragColor=vec4(s/ws,1.0);}`,uniforms:{tex:{value:src.texture},d:{value:dir}}}));
  g(b1,b2,new THREE.Vector2(4*K/W,0)); g(b2,b1,new THREE.Vector2(0,4*K/H)); g(b1,b2,new THREE.Vector2(8*K/W,0)); g(b2,b1,new THREE.Vector2(0,8*K/H));
  bloomTex=b1.texture;
}
// final: downsample, bloom add, grain, vignette, contrast
const finMat=new THREE.ShaderMaterial({vertexShader:FSV,fragmentShader:`uniform sampler2D tex; uniform sampler2D tBloom; uniform float bloomK; uniform float grain,vignette,contrast,lift,scan,seed,shot; uniform vec2 res; uniform vec2 px; varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed*91.7)*43758.5453);}
  void main(){
    vec3 c=(texture2D(tex,vUv+px*vec2(-0.25,-0.25)).rgb+texture2D(tex,vUv+px*vec2(0.25,-0.25)).rgb+texture2D(tex,vUv+px*vec2(-0.25,0.25)).rgb+texture2D(tex,vUv+px*vec2(0.25,0.25)).rgb)*0.25;
    if(bloomK>0.0){ c+=texture2D(tBloom,vUv).rgb*bloomK; }
    float n=hash(vUv*res)-0.5; float lum=dot(c,vec3(0.299,0.587,0.114));
    c+=n*(grain + shot*(0.05+0.16*sqrt(max(lum,0.0))));
    c+=scan*(hash(vec2(floor(vUv.y*res.y),1.0))-0.5)*0.02;
    c=(c-0.5)*contrast+0.5+lift;
    vec2 d=vUv-0.5; c*=1.0-vignette*dot(d,d)*2.2;
    gl_FragColor=vec4(clamp(c,0.0,1.0),1.0); }`,
  uniforms:{tex:{value:dofRT.texture},tBloom:{value:bloomTex},bloomK:{value:post.bloom?post.bloom.strength:0},grain:{value:post.grain},vignette:{value:post.vignette},contrast:{value:post.contrast},lift:{value:post.lift},scan:{value:post.scan},seed:{value:0.37},shot:{value:post.shot},res:{value:new THREE.Vector2(OW,OH)},px:{value:new THREE.Vector2(1/W*2,1/H*2)}}});
fs(null,finMat);
console.log('render ms',(performance.now()-__t0).toFixed(0));
requestAnimationFrame(()=>{ fs(null,finMat); window.__done=true; });
