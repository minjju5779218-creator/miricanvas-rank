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
    c[k]=list.slice(0,lim).map((x,i)=>col?[i+1,x.idx,x.name,x.collectionCount,(x.originKeywords||'').split('|').slice(0,5).join('|'),(x.thumbnailUrlList||[x.thumbnailUrl]).slice(0,1).map(t=>(t||'').replace(P,''))]:[i+1,x.idx,x.name,x.licenseName,x.type==='ILLUST'?'I':x.type==='BITMAP'?'B':x.type,x.priceInfo?x.priceInfo.price:0,(x.originKeywords||'').split('|').slice(0,6).join('|'),(x.thumbnailUrl||'').replace(P,''),(x.collectionList&&x.collectionList[0]?x.collectionList[0].name:'')]);}
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
