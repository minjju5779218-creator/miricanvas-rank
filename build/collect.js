// MiriCanvas editor collector v2 (top 100 per tier). Run inside https://www.miricanvas.com/design
// 1) await window.__setup(KEYWORDS)          -> true
// 2) await window.__chunk(28000)             -> repeat until 'left 0'
// 3) window.__compact()                      -> number of keys
// 4) await window.__exportGz()               -> 'N parts'; then read window.__gzParts[i] one by one
(function(){
const P='https://file.miricanvas.com/resources/designresource/';
const TARGET=100, PAGES=Math.ceil(TARGET/30);
window.__setup=async function(kws){
  window.__KW=kws;
  if(!window.__data){window.__data=[];const op=window.__data.push.bind(window.__data);window.__data.push=function(...a){const r=op(...a);(window.__waiters||[]).forEach(f=>f());return r;};}
  window.__waiters=window.__waiters||[];
  if(!window.__hooked){window.__hooked=true;
    const ok=u=>u.includes('/designresource/api/d/element?')||u.includes('/designresource/api/p/element/collection?');
    const of=window.fetch;window.fetch=async function(i,o){const url=typeof i==='string'?i:i.url;const r=await of.apply(this,arguments);if(ok(url)){try{const t=await r.clone().text();window.__data.push({url,t})}catch(e){}}return r};
    const oo=XMLHttpRequest.prototype.open,os=XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open=function(m,u){this.__u2=u;return oo.apply(this,arguments)};
    XMLHttpRequest.prototype.send=function(b){const u=String(this.__u2||'');if(ok(u)){this.addEventListener('load',()=>window.__data.push({url:u,t:String(this.responseText)}))}return os.apply(this,arguments)};}
  if(!document.querySelector('input[placeholder*="검색"]')){const btn=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='요소');if(btn)btn.click();await new Promise(r=>setTimeout(r,1500));}
  return !!document.querySelector('input[placeholder*="검색"]');
};
const U=d=>new URL(d.url);
const kwOf=d=>U(d).searchParams.get('keyword');
const pageOf=d=>+U(d).searchParams.get('page');
const tierOf=d=>U(d).searchParams.get('tier');
const isE=d=>d.url.includes('/d/element?');
function baseQ(d){const u=U(d);u.searchParams.delete('page');return u.search;}
function listOf(d){try{return JSON.parse(d.t).data.list||[]}catch(e){return []}}
function pagesFor(kw,tier){
  const e=window.__data.filter(d=>isE(d)&&kwOf(d)===kw&&tierOf(d)===tier);
  const full=e.filter(d=>U(d).searchParams.get('pageSize')==='30');
  if(!full.length)return {n:0,q:null,last:false};
  const ref=full.find(d=>pageOf(d)===2)||full.find(d=>pageOf(d)===1);
  const q=baseQ(ref);const mine=full.filter(d=>baseQ(d)===q);
  const ps=new Set(mine.map(pageOf));let n=0;while(ps.has(n+1))n++;
  const last=mine.some(d=>pageOf(d)<=n&&listOf(d).length<30);
  return {n,q,last};}
window.__doneSet=window.__doneSet||new Set();
window.__done=kw=>window.__doneSet.has(kw)||(window.__skipKw||{})[kw]>=3||['FREE','PREMIUM'].every(t=>{const s=pagesFor(kw,t);return s.n>=PAGES||(s.n>=1&&s.last);});
window.__left=()=>window.__KW.filter(kw=>!window.__done(kw));
function scroller(){const imgs=[...document.querySelectorAll('img')].filter(i=>i.src.includes('designresource'));let el=imgs[imgs.length-1];while(el){const cs=getComputedStyle(el);if((cs.overflowY==='auto'||cs.overflowY==='scroll')&&el.scrollHeight>el.clientHeight)return el;el=el.parentElement;}return null;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function waitData(pred,ms){return new Promise(res=>{if(pred())return res(true);const chk=()=>{if(pred()){window.__waiters=window.__waiters.filter(f=>f!==chk);res(true);}};window.__waiters.push(chk);setTimeout(()=>{window.__waiters=window.__waiters.filter(f=>f!==chk);res(pred());},ms);});}
window.__collect=async function(kw){
  const inp=document.querySelector('input[placeholder*="검색"]');inp.focus();
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(inp,kw);inp.dispatchEvent(new Event('input',{bubbles:true}));
  await Promise.resolve();for(const t of ['keydown','keypress','keyup'])inp.dispatchEvent(new KeyboardEvent(t,{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));
  await waitData(()=>['FREE','PREMIUM'].every(t=>pagesFor(kw,t).n>=1),10000);
  await sleep(500);
  for(let k=0;k<12&&!window.__done(kw);k++){const sc=scroller();if(sc){sc.scrollTop=sc.scrollHeight;sc.dispatchEvent(new Event('scroll'));}
    const before=window.__data.length;await waitData(()=>window.__data.length>before,2500);await sleep(300);}
  if(window.__done(kw))finalize(kw);
  else{window.__skipKw=window.__skipKw||{};window.__skipKw[kw]=(window.__skipKw[kw]||0)+1;if(window.__skipKw[kw]>=3)finalize(kw);}
  const e=window.__c[kw+'|PREMIUM|E'],f=window.__c[kw+'|FREE|E'];
  return kw+':'+(e?e.length+'/'+f.length:'retry');
};
window.__chunk=async function(budget){const out=[];const t0=Date.now();while(Date.now()-t0<budget){const kw=window.__left()[0];if(!kw)break;out.push(await window.__collect(kw));}
  return out.join(' ')+' | left '+window.__left().length;};
function compactKw(kw,c){
  for(const tier of ['PREMIUM','FREE']){
    const s=pagesFor(kw,tier);const rows=[];const seenP=new Set(),seen=new Set();
    const reqs=s.q?window.__data.filter(d=>isE(d)&&kwOf(d)===kw&&tierOf(d)===tier&&baseQ(d)===s.q).sort((a,b)=>pageOf(a)-pageOf(b)):[];
    for(const d of reqs){const p=pageOf(d);if(seenP.has(p)||p>s.n)continue;seenP.add(p);for(const x of listOf(d)){if(seen.has(x.idx))continue;seen.add(x.idx);rows.push(x);}}
    c[kw+'|'+tier+'|E']=rows.slice(0,TARGET).map((x,i)=>[i+1,x.idx,x.name,x.licenseName,x.type==='ILLUST'?'I':x.type==='BITMAP'?'B':x.type,x.priceInfo?x.priceInfo.price:0,(x.originKeywords||'').split('|').slice(0,20).join('|'),(x.thumbnailUrl||'').replace(P,''),(x.collectionList&&x.collectionList[0]?x.collectionList[0].name:'')]);
    const col=window.__data.find(d=>d.url.includes('/collection?')&&kwOf(d)===kw&&tierOf(d)===tier&&pageOf(d)===1);
    const cl=col?listOf(col):[];
    c[kw+'|'+tier+'|C']=cl.slice(0,12).map((x,i)=>[i+1,x.idx,x.name,x.collectionCount,(x.originKeywords||'').split('|').slice(0,5).join('|'),(x.thumbnailUrlList||[x.thumbnailUrl]).slice(0,1).map(t=>(t||'').replace(P,''))]);
  }}
window.__c=window.__c||{};
window.__compact=function(){for(const kw of window.__KW)if(!window.__c[kw+'|PREMIUM|E'])compactKw(kw,window.__c);return Object.keys(window.__c).length;};
function finalize(kw){compactKw(kw,window.__c);window.__doneSet.add(kw);const keep=window.__data.filter(d=>kwOf(d)!==kw);window.__data.length=0;keep.forEach(d=>Array.prototype.push.call(window.__data,d));}
window.__exportGz=async function(){
  const s=new Blob([JSON.stringify(window.__c)]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf=new Uint8Array(await new Response(s).arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=8192)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+8192));
  const b64=btoa(bin);window.__gzParts=[];for(let i=0;i<b64.length;i+=500000)window.__gzParts.push(b64.slice(i,i+500000));
  return window.__gzParts.length+' parts, '+b64.length+' chars';};
})();
'collector v2 ready';
