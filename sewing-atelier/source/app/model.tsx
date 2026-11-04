'use client';
import React,{useEffect,useRef} from 'react';
type V=[number,number,number];
type Vertex={p:V;u:number;v:number};
type Face={p:Vertex[];part:string;color:string;texture:string};
// CPU-projected mesh keeps the template interactive on devices without WebGL.
// Geometry is a visual template, not a sewing or cloth simulation.
export default function Model({fabric,selected='body',length=8.7,sleeve=7.8,collar=.55,type='blouse'}:{fabric:any;selected?:string;length?:number;sleeve?:number;collar?:number;type?:string}){
const ref=useRef<HTMLCanvasElement>(null),controls=useRef<any>(null);
useEffect(()=>{const c=ref.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;let yaw=.25,pitch=-.04,zoom=1,target=.25,frame=0,alive=true;const faces:Face[]=[];
const col=fabric?.color||'#ded3c1',tex=fabric?.texture||'linen';
function tube(part:string,rows:number,shape:(t:number,a:number)=>V,color:string,texture=''){const cols=48;for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const at=(row:number,cl:number)=>({p:shape(row/rows,cl/cols*Math.PI*2),u:cl/cols,v:row/rows});faces.push({p:[at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1)],part,color,texture});}}
function disc(y:number,r:number,color:string){tube('stand',1,(t,a)=>[Math.cos(a)*r*t,y,Math.sin(a)*r*t],color);}
tube('stand',1,(t,a)=>[Math.cos(a)*(1.8-t*.1),-6.4+t*.25,Math.sin(a)*(1.8-t*.1)],'#b59a71');disc(-6.15,1.7,'#b59a71');tube('pole',1,(t,a)=>[Math.cos(a)*.085,-6.15+t*3.9,Math.sin(a)*.085],'#baa17c');
if(type==='bag'||type==='pouch'){
tube('body',22,(t,a)=>{const r=type==='pouch'?1.1+1.2*Math.sin(Math.PI*t*.85):2.25;return[Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.4)*r,-3.8+t*6.2,Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.7)*1.05];},col,tex);if(type==='bag')for(const z of[-.83,.83])tube('handle',25,(t,a)=>[Math.cos(t*Math.PI)*1.6+Math.cos(a)*.11,2.3+Math.sin(t*Math.PI)*2.6,z+Math.sin(a)*.11],'#bca688');else tube('collar',5,(t,a)=>[Math.cos(a)*(1.2+t*.15),2.1+t*.4,Math.sin(a)*.85],'#bca688');}
else{
tube('skirt',20,(t,a)=>{const r=(type==='skirt'?1.25:1.9)+t*1.1+.045*Math.sin(a*14)*t;const top=type==='skirt'?2:(1.5-length/2+.03);return[Math.cos(a)*r,top-t*(type==='skirt'?6:3.1),Math.sin(a)*r*.69];},type==='skirt'?col:'#393344',type==='skirt'?tex:'');if(type!=='skirt'){
tube('body',36,(t,a)=>{const y=t*length-length/2+1.5;const r=t<.28?1.91-t/.28*.62:t<.65?1.29+(t-.28)/.37*.62:t<.88?1.91-(t-.65)/.23*.21:1.7-(t-.88)/.12*1.08;return[Math.cos(a)*r,y,Math.sin(a)*r*.68];},col,tex);
for(const s of[-1,1])tube('sleeve',25,(t,a)=>{const r=.53-.11*t+.035*Math.sin(t*Math.PI);return[s*(1.65+t*1.45)+Math.cos(a)*r,5.2-t*sleeve*.79,Math.sin(a)*r];},col,tex);
tube('collar',4,(t,a)=>[Math.cos(a)*.62,5.75+t*collar,Math.sin(a)*.45],col,tex);tube('neck',3,(t,a)=>[Math.cos(a)*.37,6.05+t*.55,Math.sin(a)*.33],'#d7c3a2');disc(6.6,.37,'#d7c3a2');}}
let imageData:ImageData|undefined;
const rgb=(h:string)=>[1,3,5].map(n=>parseInt(h.slice(n,n+2),16));
function transform(p:V):V{const cs=Math.cos(yaw),sn=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),x=p[0]*cs+p[2]*sn,z=-p[0]*sn+p[2]*cs;return[x,p[1]*cp-z*sp,p[1]*sp+z*cp];}
function project(p:V,w:number,h:number):[number,number]{const s=Math.min(w/10.3,h/15.7)*zoom,d=1-p[2]*.018;return[w/2+p[0]*s/d,h*.47-p[1]*s/d];}
function draw(){if(!alive)return;const r=c!.getBoundingClientRect(),w=r.width,h=r.height;if(!w||!h)return;const dpr=Math.min(devicePixelRatio||1,2);if(c!.width!==w*dpr||c!.height!==h*dpr){c!.width=w*dpr;c!.height=h*dpr;}ctx!.setTransform(dpr,0,0,dpr,0,0);ctx!.clearRect(0,0,w,h);const sorted=faces.map(f=>{const v=f.p.map(a=>transform(a.p));return{f,v,z:v.reduce((s,q)=>s+q[2],0)/v.length};}).sort((a,b)=>a.z-b.z);
for(const{f,v}of sorted){const a=v[0],b=v[1],d=v[2],ab=b.map((q,k)=>q-a[k]),ac=d.map((q,k)=>q-a[k]);const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],len=Math.hypot(...n)||1;let l=.46+.54*Math.abs((n[0]*-.4+n[1]*.65+n[2]*.85)/len);let color=rgb(f.color);const u=f.p.reduce((s,p)=>s+p.u,0)/4,t=f.p.reduce((s,p)=>s+p.v,0)/4;
if(f.texture){if(imageData){const x=Math.floor((u*2%1)*imageData.width),y=Math.floor((t*2%1)*imageData.height),offset=(y*imageData.width+x)*4;color=Array.from(imageData.data.slice(offset,offset+3));}else if(f.texture==='gingham'){const a=Math.floor(u*18)%2,b=Math.floor(t*24)%2;color=color.map(q=>q*(.7+.12*a+.12*b)+(a&&b?24:0));}else if(f.texture==='knit')l*=.94+.06*Math.cos(u*150);else if(f.texture==='lace')l*=.86+.14*Math.sin(u*100)*Math.sin(t*100);else if(f.texture==='leather')l*=1.03;}
if(f.part===selected)color=color.map((q,i)=>Math.min(255,q+(i===2?20:7)));const fill='rgb('+color.map(q=>Math.min(255,Math.round(q*l))).join(',')+')';ctx!.beginPath();v.forEach((q,i)=>{const[x,y]=project(q,w,h);if(i===0)ctx!.moveTo(x,y);else ctx!.lineTo(x,y);});ctx!.closePath();ctx!.fillStyle=fill;ctx!.fill();ctx!.strokeStyle=fill;ctx!.lineWidth=.6;ctx!.stroke();}
// Front buttons show spatial continuity when orbiting the template.
if(type==='blouse')for(let i=0;i<6;i++){const y=4.9-i*.82,t=(y+length/2-1.5)/length,r=t<.65?1.29+(t-.28)/.37*.62:t<.88?1.91-(t-.65)/.23*.21:1.7-(t-.88)/.12*1.08;const p=transform([.12,y,r*.69]);if(p[2]>0){const[x,yy]=project(p,w,h);ctx!.beginPath();ctx!.arc(x,yy,1.4*zoom,0,Math.PI*2);ctx!.fillStyle='#b49a73';ctx!.fill();}}
}
if(fabric?.image){const img=new Image();img.onload=()=>{if(!alive)return;try{const cv=document.createElement('canvas');cv.width=cv.height=96;const cx=cv.getContext('2d')!;cx.drawImage(img,0,0,96,96);imageData=cx.getImageData(0,0,96,96);draw();}catch{}};img.src=fabric.image;}
function animate(){yaw+=(target-yaw)*.16;draw();if(Math.abs(target-yaw)>.001)frame=requestAnimationFrame(animate);}
controls.current={view:(v:number)=>{target=v;cancelAnimationFrame(frame);if(matchMedia('(prefers-reduced-motion: reduce)').matches){yaw=v;draw();}else animate();}};
let dragging=false,px=0,py=0;const down=(e:PointerEvent)=>{dragging=true;px=e.clientX;py=e.clientY;c.setPointerCapture(e.pointerId);cancelAnimationFrame(frame);},move=(e:PointerEvent)=>{if(dragging){yaw+=(e.clientX-px)*.012;target=yaw;pitch=Math.max(-.45,Math.min(.45,pitch+(e.clientY-py)*.006));px=e.clientX;py=e.clientY;draw();}},up=()=>{dragging=false;},wheel=(e:WheelEvent)=>{e.preventDefault();zoom=Math.max(.7,Math.min(1.6,zoom-e.deltaY*.001));draw();};c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('wheel',wheel,{passive:false});const ro=new ResizeObserver(draw);ro.observe(c);draw();return()=>{alive=false;ro.disconnect();cancelAnimationFrame(frame);c.removeEventListener('pointerdown',down);c.removeEventListener('pointermove',move);c.removeEventListener('pointerup',up);c.removeEventListener('wheel',wheel);};
},[fabric,selected,length,sleeve,collar,type]);
return <div className="model-view"><div className="model-halo"/><canvas ref={ref} aria-label="可拖动旋转、滚轮缩放的三维款式模板"/><div className="orbit-ring"/><div className="view-controls">{[['正面',0],['背面',Math.PI],['侧面',Math.PI/2]].map(([t,v])=><button key={t} onClick={()=>controls.current?.view(v)}>{t}</button>)}</div><span className="model-caption">拖动旋转 · 滚轮缩放 · 轮廓预览</span></div>}
