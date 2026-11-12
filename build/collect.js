// MiriCanvas editor collector. Run inside https://www.miricanvas.com/design (element panel).
// Step 1 (once after page load): await window.__setup(KEYWORDS_ARRAY)
// Step 2 (repeat until left==0):   await window.__chunk(25000)
// Step 3:                           await window.__buildThumbs(25000)  (repeat until done)
// Step 4:                           window.__exportData()  -> JSON string of compact data (may need to split: __exportDataPart(i,n))
// Step 5:                           window.__thumbParts.length, then 'P'+i+window.__thumbParts[i]
(function(){
const P='https://file.miricanvas.com/resources/designresource/';
window.__setup = async function(kws){
  window.__KW = kws;
  if(!window.__data){ window.__data=[];
    const op=window.__data.push.bind(window.__data);
    window.__data.push=function(...a){const r=op(...a);(window.__waiters||[]).forEach(f=>f());return r;};
  }
  window.__waiters=[];
  if(!window.__hooked){ window.__hooked=true;
    const ok=u=>u.includes('/designresource/api/d/element?')||u.includes('/designresource/api/p/element/collection?');
    const of=window.fetch; window.fetch=async function(i,o){const url=typeof i==='string'?i:i.url;const r=await of.apply(this,arguments);if(ok(url)){try{const t=await r.clone().text();window.__data.push({url,t})}catch(e){}}return r};
    const oo=XMLHttpRequest.prototype.open,os=XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open=function(m,u){this.__u2=u;return oo.apply(this,arguments)};
    XMLHttpRequest.prototype.send=function(b){const u=String(this.__u2||'');if(ok(u)){this.addEventListener('load',()=>window.__data.push({url:u,t:String(this.responseText)}))}return os.apply(this,arguments)};
  }
  const btn=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='요소'); if(btn) btn.click();
  await new Promise(r=>setTimeout(r,1500));
  return !!document.querySelector('input[placeholder*="검색"]');
};
const kwOf=d=>new URL(d.url).searchParams.get('keyword');
const isFull=d=>new URL(d.url).searchParams.get('pageSize')==='30';
window.__left=()=>window.__KW.filter(kw=>!window.__data.some(d=>kwOf(d)===kw&&d.url.includes('/d/element')&&isFull(d)));
window.__search2=function(kw){return new Promise(res=>{
  const cnt=()=>window.__data.filter(d=>kwOf(d)===kw&&isFull(d)).length;
  const chk=()=>{if(cnt()>=4){window.__waiters=window.__waiters.filter(f=>f!==chk);res(kw+':'+cnt());}};
  window.__waiters.push(chk);
  const inp=document.querySelector('input[placeholder*="검색"]'); inp.focus();
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(inp,kw); inp.dispatchEvent(new Event('input',{bubbles:true}));
  Promise.resolve().then(()=>{for(const t of ['keydown','keypress','keyup']) inp.dispatchEvent(new KeyboardEvent(t,{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));});
});};
window.__chunk=async function(budget){const out=[];const t0=Date.now();while(Date.now()-t0<budget){const kw=window.__left()[0];if(!kw)break;out.push(await Promise.race([window.__search2(kw),new Promise(r=>setTimeout(()=>r('timeout '+kw),12000))]));}return out.join(' ')+' | left '+window.__left().length;};
window.__compact=function(){const c={};
  for(const d of window.__data){const u=new URL(d.url);const kw=u.searchParams.get('keyword');if(!window.__KW.includes(kw)||u.searchParams.get('pageSize')!=='30')continue;
    const tier=u.searchParams.get('tier'),col=d.url.includes('/collection');let j;try{j=JSON.parse(d.t)}catch(e){continue};
    const list=(j.data&&j.data.list)||[];const k=kw+'|'+tier+'|'+(col?'C':'E');const lim=col?12:(tier==='FREE'?15:30);
    c[k]=list.slice(0,lim).map((x,i)=>col?[i+1,x.idx,x.name,x.collectionCount,(x.originKeywords||'').split('|').slice(0,5).join('|'),(x.thumbnailUrlList||[x.thumbnailUrl]).slice(0,1).map(t=>(t||'').replace(P,''))]:[i+1,x.idx,x.name,x.licenseName,x.type==='ILLUST'?'I':x.type==='BITMAP'?'B':x.type,x.priceInfo?x.priceInfo.price:0,(x.originKeywords||'').split('|').slice(0,20).join('|'),(x.thumbnailUrl||'').replace(P,''),(x.collectionList&&x.collectionList[0]?x.collectionList[0].name:'')]);}
  window.__c=c; return Object.keys(c).length;};
window.__exportDataPart=function(i,n){const ks=Object.keys(window.__c).sort();const per=Math.ceil(ks.length/n);const o={};ks.slice(i*per,(i+1)*per).forEach(k=>o[k]=window.__c[k]);return 'D'+i+JSON.stringify(o)+'\n'+'x'.repeat(70000);};
async function thumb(path){try{const r=await fetch(P+path);const b=await r.blob();const bm=await createImageBitmap(b);const s=Math.min(1,100/Math.max(bm.width,bm.height));const c=new OffscreenCanvas(Math.max(1,Math.round(bm.width*s)),Math.max(1,Math.round(bm.height*s)));c.getContext('2d').drawImage(bm,0,0,c.width,c.height);const o=await c.convertToBlob({type:'image/webp',quality:0.66});const buf=new Uint8Array(await o.arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=8192)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+8192));return 'data:image/webp;base64,'+btoa(bin)}catch(e){return ''}}
window.__buildThumbs=async function(budget){
  if(!window.__th) window.__th={};
  const need=new Set();for(const [k,v] of Object.entries(window.__c)){if(k.endsWith('|E'))v.forEach(r=>r[7]&&need.add(r[7]));else v.slice(0,4).forEach(r=>r[5][0]&&need.add(r[5][0]));}
  const q=[...need].filter(p=>!(p in window.__th));const t0=Date.now();let i=0;
  async function w(){while(Date.now()-t0<budget){const p=q[i++];if(!p)return;window.__th[p]=await thumb(p);}}
  await Promise.all(Array.from({length:10},w));
  const done=[...need].filter(p=>p in window.__th).length;
  if(done===need.size){const parts=[];let cur={},sz=0;for(const p of need){const v=window.__th[p]||'';if(sz+v.length>700000){parts.push(cur);cur={};sz=0;}cur[p]=v;sz+=v.length+60;}parts.push(cur);window.__thumbParts=parts.map(o=>JSON.stringify(o));}
  return done+'/'+need.size+(window.__thumbParts?' parts '+window.__thumbParts.length:'');
};
})();
'collector ready';
// Style features computed in the editor page (no thumbnail transfer needed).
// window.__feat(path) -> [colors, sat, outline, texture, fill, aspect*10]
// window.__featAll(budget) -> 'done/total'; then window.__featExport(i,n)
(function(){
const P='https://file.miricanvas.com/resources/designresource/';
function hls(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);const l=(mx+mn)/2;let s=0;if(mx!==mn){const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);}return [l,s];}
window.__feat=async function(path){try{
  const r=await fetch(P+path);const bm=await createImageBitmap(await r.blob());
  const sc=Math.min(1,112/Math.max(bm.width,bm.height));const w=Math.max(1,Math.round(bm.width*sc)),h=Math.max(1,Math.round(bm.height*sc));
  const cv=new OffscreenCanvas(w,h);const ctx=cv.getContext('2d');ctx.drawImage(bm,0,0,w,h);const d=ctx.getImageData(0,0,w,h).data;
  const at=(x,y)=>(y*w+x)*4;let hasA=false;for(let i=3;i<d.length;i+=12){if(d[i]<200){hasA=true;break;}}
  const solid=(x,y)=>{const i=at(x,y);return hasA?d[i+3]>=128:!(d[i]>245&&d[i+1]>245&&d[i+2]>245);};
  const pts=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(solid(x,y))pts.push([x,y]);
  if(pts.length<20)return null;
  let x0=1e9,x1=-1,y0=1e9,y1=-1;for(const [x,y] of pts){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  const bw=x1-x0+1,bh=y1-y0+1;const fill=pts.length/(bw*bh),aspect=bw/bh;
  let ss=0,sn=0;for(const [x,y] of pts){const i=at(x,y);const [l,s]=hls(d[i],d[i+1],d[i+2]);if(l>0.08&&l<0.92){ss+=s;sn++;}}
  const sat=sn?ss/sn:0;
  let edge=0,dark=0;for(const [x,y] of pts){if(x===0||y===0||x===w-1||y===h-1)continue;if(!(solid(x-1,y)&&solid(x+1,y)&&solid(x,y-1)&&solid(x,y+1))){edge++;const i=at(x,y);if(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]<80)dark++;}}
  const outline=edge?dark/edge:0;
  let soft=0,flat=0;for(const [x,y] of pts){if(x+1<w&&solid(x+1,y)){const i=at(x,y),j=at(x+1,y);const df=Math.abs(d[i]-d[j])+Math.abs(d[i+1]-d[j+1])+Math.abs(d[i+2]-d[j+2]);if(df<=6)flat++;else if(df<=60)soft++;}}
  const texture=soft+flat?soft/(soft+flat):0;
  const hist=new Map();for(const [x,y] of pts){const i=at(x,y);const k=((d[i]>>4)<<8)|((d[i+1]>>4)<<4)|(d[i+2]>>4);const e=hist.get(k)||[0,0,0,0];e[0]++;e[1]+=d[i];e[2]+=d[i+1];e[3]+=d[i+2];hist.set(k,e);}
  const bins=[...hist.values()].sort((a,b)=>b[0]-a[0]);const cols=[];
  for(const e of bins){if(e[0]/pts.length<0.04)break;const c=[e[1]/e[0],e[2]/e[0],e[3]/e[0]].map(Math.round);if(cols.some(o=>Math.abs(o[0]-c[0])+Math.abs(o[1]-c[1])+Math.abs(o[2]-c[2])<60))continue;cols.push(c);if(cols.length===4)break;}
  const hex=cols.map(c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join(''));
  return [hex,Math.round(sat*100),Math.round(outline*100),Math.round(texture*100),Math.round(fill*100),Math.round(aspect*10)];
}catch(e){return null}};
window.__featAll=async function(budget){
  if(!window.__F)window.__F={};
  const need=[];for(const [k,v] of Object.entries(window.__c)){if(k.endsWith('|E'))v.forEach(r=>{if(r[7]&&!(r[7] in window.__F))need.push(r[7]);});}
  const q=[...new Set(need)];const t0=Date.now();let i=0;
  async function w(){while(Date.now()-t0<budget){const p=q[i++];if(!p)return;window.__F[p]=await window.__feat(p);}}
  await Promise.all(Array.from({length:10},w));
  const all=new Set();for(const [k,v] of Object.entries(window.__c)){if(k.endsWith('|E'))v.forEach(r=>r[7]&&all.add(r[7]));}
  const done=[...all].filter(p=>p in window.__F).length;
  if(done===all.size){for(const [k,v] of Object.entries(window.__c)){if(k.endsWith('|E'))v.forEach(r=>{r.length=9;r.push(window.__F[r[7]]||null);});}}
  return done+'/'+all.size;
};
})();

