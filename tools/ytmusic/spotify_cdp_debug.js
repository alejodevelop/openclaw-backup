#!/usr/bin/env node
const http = require('http');
const WebSocket = globalThis.WebSocket;
function getJson(url){return new Promise((resolve,reject)=>{http.get(url,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(JSON.parse(d))}catch(e){reject(e)}})}).on('error',reject)})}
(async()=>{
  const tabs = await getJson('http://127.0.0.1:9223/json/list');
  const tab = tabs.find(t => t.type==='page' && /^https:\/\/open\.spotify\.com/.test(t.url));
  if(!tab) throw new Error('No Spotify tab');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id=0; const pending = new Map();
  ws.onmessage = ev => { const msg = JSON.parse(String(ev.data)); if(msg.id && pending.has(msg.id)){ pending.get(msg.id)(msg); pending.delete(msg.id);} };
  await new Promise((res,rej)=>{ ws.onopen = res; ws.onerror = rej; });
  const send = (method, params={}) => new Promise((resolve,reject)=>{ const mid=++id; pending.set(mid, resolve); ws.send(JSON.stringify({id:mid, method, params})); setTimeout(()=>{ if(pending.has(mid)){ pending.delete(mid); reject(new Error('timeout '+method)); } }, 10000); });
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
  const expression = `(() => {
    const body = document.body.innerText || '';
    const text = body.slice(0, 8000);
    const m = text.match(/Now playing:\\s*([^\\n]+?)\\s+by\\s+([^\\n]+)/i);
    const progress = text.match(/(\\d+:\\d+)\\s+Change progress\\s+(\\d+:\\d+)/);
    const npRegion = Array.from(document.querySelectorAll('[aria-label], button, a'))
      .map(el => ({aria: el.getAttribute && el.getAttribute('aria-label') || '', txt: (el.innerText||'').trim()}))
      .find(x => /Now playing:/i.test(x.aria));
    let title = null, artist = null;
    if (m) { title = m[1].trim(); artist = m[2].trim(); }
    else if (npRegion && /Now playing:/i.test(npRegion.aria)) {
      const mm = npRegion.aria.match(/Now playing:\\s*(.*?)\\s+by\\s+(.*)$/i);
      if (mm) { title = mm[1].trim(); artist = mm[2].trim(); }
    }
    const isPlaying = !!Array.from(document.querySelectorAll('button')).find(b => /pause/i.test((b.getAttribute('aria-label')||'') + ' ' + (b.innerText||'')));
    return {
      href: location.href,
      title,
      artist,
      isPlaying,
      progressCurrent: progress ? progress[1] : null,
      progressTotal: progress ? progress[2] : null,
      pageTitle: document.title
    };
  })()`;
  const res = await send('Runtime.evaluate', {expression, awaitPromise:true, returnByValue:true});
  console.log(JSON.stringify(res, null, 2));
  ws.close();
})().catch(err=>{ console.error(err && err.stack || String(err)); process.exit(1); });
