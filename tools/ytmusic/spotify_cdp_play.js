const http = require('http');
const WebSocket = globalThis.WebSocket;
if (!WebSocket) throw new Error('Global WebSocket is unavailable in this Node runtime');

function getJson(url){
  return new Promise((resolve,reject)=>{
    http.get(url,res=>{
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>{ try{ resolve(JSON.parse(d)); } catch(e){ reject(e); } });
    }).on('error',reject);
  });
}

(async()=>{
  const tabs = await getJson('http://127.0.0.1:9223/json/list');
  const tab = tabs.find(t => t.type==='page' && /^https:\/\/open\.spotify\.com/.test(t.url));
  if(!tab) throw new Error('No Spotify tab');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id=0;
  const pending = new Map();

  ws.onmessage = ev => {
    const msg = JSON.parse(String(ev.data));
    if(msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  await new Promise((res,rej)=>{
    ws.onopen = () => res();
    ws.onerror = err => rej(err);
  });

  const send = (method, params={}) => new Promise((resolve,reject)=>{
    const mid = ++id;
    pending.set(mid, msg => resolve(msg));
    ws.send(JSON.stringify({id:mid, method, params}));
    setTimeout(()=>{
      if(pending.has(mid)) {
        pending.delete(mid);
        reject(new Error('timeout '+method));
      }
    }, 10000);
  });

  async function evalExpr(expression){
    const res = await send('Runtime.evaluate', {expression, awaitPromise:true, returnByValue:true});
    if(res.result && res.result.exceptionDetails) {
      return {__evalError: res.result.exceptionDetails.text || 'eval error'};
    }
    return res.result?.result?.value;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  const infoBefore = await evalExpr(`(() => ({
    href: location.href,
    title: document.title,
    playButtons: Array.from(document.querySelectorAll('button')).map(b => ({txt:(b.innerText||'').trim(), aria:b.getAttribute('aria-label')||'', title:b.getAttribute('title')||''})).filter(x => /play|pause|reproduc|pausa/i.test((x.txt+' '+x.aria+' '+x.title))).slice(0,20)
  }))()`);

  const result = await evalExpr(`(() => {
    function visible(el){ if(!el) return false; const s=getComputedStyle(el); const r=el.getBoundingClientRect(); return s && s.visibility!=='hidden' && s.display!=='none' && r.width>0 && r.height>0; }
    const btns = Array.from(document.querySelectorAll('button'));
    const candidates = btns.filter(b => visible(b)).map(b => ({
      el:b,
      aria:(b.getAttribute('aria-label')||'').trim(),
      title:(b.getAttribute('title')||'').trim(),
      text:(b.innerText||'').trim(),
      cls: typeof b.className === 'string' ? b.className : ''
    }));
    let target = candidates.find(x => /play los malaventurados no lloran/i.test(x.aria+' '+x.title+' '+x.text));
    if(!target) target = candidates.find(x => /^play$/i.test(x.aria) || /^play$/i.test(x.title) || /^reproducir$/i.test(x.aria));
    if(!target) target = candidates.find(x => /play/i.test(x.aria+' '+x.title+' '+x.text));
    if(!target) return {ok:false, reason:'no-play-button', sample:candidates.slice(0,30).map(x=>({aria:x.aria,title:x.title,text:x.text,cls:String(x.cls).slice(0,80)}))};
    target.el.click();
    return {ok:true, clicked:{aria:target.aria,title:target.title,text:target.text}};
  })()`);

  await new Promise(r=>setTimeout(r,2500));

  const infoAfter = await evalExpr(`(() => ({
    href: location.href,
    title: document.title,
    bodyHasTrack: document.body.innerText.includes('Los Malaventurados No Lloran'),
    pauseButtons: Array.from(document.querySelectorAll('button')).map(b => ({txt:(b.innerText||'').trim(), aria:b.getAttribute('aria-label')||'', title:b.getAttribute('title')||''})).filter(x => /pause|pausa/i.test((x.txt+' '+x.aria+' '+x.title))).slice(0,20),
    nowPlayingText: document.body.innerText.slice(0,4000)
  }))()`);

  console.log(JSON.stringify({infoBefore, result, infoAfter}, null, 2));
  ws.close();
})().catch(err=>{
  console.error(err && err.stack || String(err));
  process.exit(1);
});
