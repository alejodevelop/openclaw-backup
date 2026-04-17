#!/usr/bin/env node
const http = require('http');
const WebSocket = globalThis.WebSocket;
function getJson(url){return new Promise((resolve,reject)=>{http.get(url,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(JSON.parse(d))}catch(e){reject(e)}})}).on('error',reject)})}
(async()=>{
  const tabs = await getJson('http://127.0.0.1:9223/json/list');
  const tab = tabs.find(t => t.type==='page' && /^https:\/\/open\.spotify\.com/.test(t.url));
  if(!tab) throw new Error('No Spotify tab');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id=0; const pending=new Map();
  ws.onmessage = ev => { const msg = JSON.parse(String(ev.data)); if(msg.id && pending.has(msg.id)){ pending.get(msg.id)(msg); pending.delete(msg.id);} };
  await new Promise((res,rej)=>{ ws.onopen = res; ws.onerror = rej; });
  const send = (method, params={}) => new Promise((resolve,reject)=>{ const mid=++id; pending.set(mid, resolve); ws.send(JSON.stringify({id:mid, method, params})); setTimeout(()=>{ if(pending.has(mid)){ pending.delete(mid); reject(new Error('timeout '+method)); } }, 10000); });
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
  const expression = `(() => {
    function visible(el){ if(!el) return false; const s=getComputedStyle(el); const r=el.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; }
    return Array.from(document.querySelectorAll('button')).filter(visible).map((b, idx) => ({
      idx,
      aria: (b.getAttribute('aria-label')||'').trim(),
      title: (b.getAttribute('title')||'').trim(),
      text: (b.innerText||'').trim(),
      dataTestId: b.getAttribute('data-testid') || '',
      className: typeof b.className === 'string' ? b.className.slice(0,120) : '',
      rect: (() => { const r = b.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()
    })).slice(0,120);
  })()`;
  const res = await send('Runtime.evaluate', {expression, awaitPromise:true, returnByValue:true});
  console.log(JSON.stringify(res.result.result.value, null, 2));
  ws.close();
})().catch(err=>{ console.error(err && err.stack || String(err)); process.exit(1); });
