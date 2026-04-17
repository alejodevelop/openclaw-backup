#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = globalThis.WebSocket;
if (!WebSocket) throw new Error('Global WebSocket unavailable');

const CDP = process.env.SPOTIFY_CDP || 'http://127.0.0.1:9223';
const BASE = 'https://open.spotify.com';
const LOCK_PATH = process.env.SPOTIFY_LOCK_PATH || path.join(__dirname, '.spotify_cdp.lock');
const LOCK_STALE_MS = Number(process.env.SPOTIFY_LOCK_STALE_MS || 60000);
const LOCK_WAIT_MS = Number(process.env.SPOTIFY_LOCK_WAIT_MS || 15000);

function getJson(url){
  return new Promise((resolve,reject)=>{
    http.get(url,res=>{
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>{ try{ resolve(JSON.parse(d)); } catch(e){ reject(e); } });
    }).on('error',reject);
  });
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function acquireLock(){
  const start = Date.now();
  while (true) {
    try {
      const fd = fs.openSync(LOCK_PATH, 'wx');
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      return () => {
        try { fs.closeSync(fd); } catch {}
        try { fs.unlinkSync(LOCK_PATH); } catch {}
      };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        const stat = fs.statSync(LOCK_PATH);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          fs.unlinkSync(LOCK_PATH);
          continue;
        }
      } catch {}
      if (Date.now() - start > LOCK_WAIT_MS) {
        throw new Error(`Timed out waiting for Spotify lock at ${LOCK_PATH}`);
      }
      await sleep(250);
    }
  }
}

async function getSpotifyTab(){
  const tabs = await getJson(`${CDP}/json/list`);
  let tab = tabs.find(t => t.type==='page' && /^https:\/\/open\.spotify\.com/.test(t.url));
  return tab || null;
}

async function connectTab(tab){
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  ws.onmessage = ev => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  await new Promise((res, rej) => {
    ws.onopen = () => res();
    ws.onerror = err => rej(err);
  });

  const send = (method, params={}) => new Promise((resolve,reject)=>{
    const mid = ++id;
    pending.set(mid, msg => resolve(msg));
    ws.send(JSON.stringify({id: mid, method, params}));
    setTimeout(()=>{
      if(pending.has(mid)) {
        pending.delete(mid);
        reject(new Error(`timeout ${method}`));
      }
    }, 10000);
  });

  async function evalExpr(expression){
    const res = await send('Runtime.evaluate', {expression, awaitPromise:true, returnByValue:true});
    if (res.result?.exceptionDetails) {
      throw new Error(res.result.exceptionDetails.text || 'eval error');
    }
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || 'eval error');
    }
    return res.result?.result?.value;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  return { ws, send, evalExpr, close: ()=>ws.close() };
}

async function ensureSpotify(){
  let tab = await getSpotifyTab();
  if (!tab) throw new Error('No Spotify tab found. Open Spotify first.');
  return tab;
}

async function navigate(send, url){
  await send('Page.navigate', { url });
  await sleep(2500);
}

async function status(evalExpr){
  return await evalExpr(`(() => {
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
  })()`);
}

async function openTrack(send, trackId){
  await navigate(send, `${BASE}/track/${trackId}`);
}

async function clickPlayOnCurrent(evalExpr){
  return await evalExpr(`(() => {
    function visible(el){ if(!el) return false; const s=getComputedStyle(el); const r=el.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; }
    const btns = Array.from(document.querySelectorAll('button')).filter(visible).map(b => ({
      el:b,
      aria:(b.getAttribute('aria-label')||'').trim(),
      text:(b.innerText||'').trim(),
      title:(b.getAttribute('title')||'').trim()
    }));
    let target = btns.find(x => /^play /i.test(x.aria));
    if (!target) target = btns.find(x => /^play$/i.test(x.aria) || /^play$/i.test(x.title));
    if (!target) target = btns.find(x => /play/i.test(x.aria+' '+x.text+' '+x.title));
    if (!target) return {ok:false, reason:'no-play-button', sample:btns.slice(0,30)};
    target.el.click();
    return {ok:true, clicked:{aria:target.aria,text:target.text,title:target.title}};
  })()`);
}

async function search(send, evalExpr, query){
  await navigate(send, `${BASE}/search/${encodeURIComponent(query)}`);
  await sleep(2000);
  return await evalExpr(`(() => ({ href: location.href, title: document.title, body: document.body.innerText.slice(0,4000) }))()`);
}

async function playbackAction(evalExpr, action){
  const testIds = {
    pause: 'control-button-playpause',
    resume: 'control-button-playpause',
    next: 'control-button-skip-forward',
    previous: 'control-button-skip-back',
    connect: null
  };
  const patterns = {
    pause: /pause|pausa/i,
    resume: /play$|^play |reproducir/i,
    next: /next|siguiente/i,
    previous: /previous|anterior/i,
    connect: /connect to a device|conectarse a un dispositivo/i
  };
  const pattern = patterns[action];
  const testId = testIds[action];
  if (!pattern) throw new Error(`Unknown action ${action}`);
  return await evalExpr(`(() => {
    function visible(el){ if(!el) return false; const s=getComputedStyle(el); const r=el.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; }
    const re = ${pattern.toString()};
    const currentAction = ${JSON.stringify(action)};
    const wantedTestId = ${JSON.stringify(testId)};
    const btns = Array.from(document.querySelectorAll('button')).filter(visible).map(b => ({
      el:b,
      aria:(b.getAttribute('aria-label')||'').trim(),
      text:(b.innerText||'').trim(),
      title:(b.getAttribute('title')||'').trim(),
      dataTestId:(b.getAttribute('data-testid')||'').trim()
    }));
    let target = null;
    if (wantedTestId) {
      target = btns.find(x => x.dataTestId === wantedTestId && re.test(x.aria+' '+x.text+' '+x.title));
      if (!target && currentAction === 'resume') {
        target = btns.find(x => x.dataTestId === wantedTestId);
      }
    }
    if (!target) target = btns.find(x => re.test(x.aria+' '+x.text+' '+x.title));
    if (!target) return {ok:false, reason:'not-found', action:${JSON.stringify(action)}, sample:btns.slice(0,30)};
    target.el.click();
    return {ok:true, action:${JSON.stringify(action)}, clicked:{aria:target.aria,text:target.text,title:target.title,dataTestId:target.dataTestId}};
  })()`);
}

async function listDevices(evalExpr){
  await playbackAction(evalExpr, 'connect');
  await sleep(1200);
  return await evalExpr(`(() => {
    const body = document.body.innerText || '';
    const lines = body.split('\n').map(x => x.trim()).filter(Boolean);
    const idx = lines.findIndex(x => /connect$/i.test(x) || /^conectar$/i.test(x));
    const nearby = idx >= 0 ? lines.slice(idx, idx + 20) : lines.slice(0, 50);
    return { lines: nearby };
  })()`);
}

async function playTitle(send, evalExpr, query, exact=false){
  await navigate(send, `${BASE}/search/${encodeURIComponent(query)}`);
  await sleep(2000);
  const click = await evalExpr(`(() => {
    function visible(el){ if(!el) return false; const s=getComputedStyle(el); const r=el.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; }
    function norm(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
    const q = norm(${JSON.stringify(query)});
    const btns = Array.from(document.querySelectorAll('button')).filter(visible).map(b => ({
      el:b,
      aria:(b.getAttribute('aria-label')||'').trim(),
      text:(b.innerText||'').trim(),
      title:(b.getAttribute('title')||'').trim()
    }));
    const playable = btns.filter(x => /play|reproduc/i.test(x.aria+' '+x.text+' '+x.title));
    const parsed = playable.map(x => {
      const source = x.aria || x.title || x.text;
      const m = source.match(/^play\s+(.+?)\s+by\s+(.+)$/i);
      return { ...x, parsedTitle: m ? m[1].trim() : source.trim(), normTitle: norm(m ? m[1] : source) };
    });
    let target = null;
    if (${exact ? 'true' : 'false'}) {
      target = parsed.find(x => x.normTitle === q);
    }
    if (!target) {
      target = parsed.find(x => x.normTitle.includes(q));
    }
    if (!target) {
      target = parsed.find(x => (x.aria+' '+x.text+' '+x.title).toLowerCase().includes(${JSON.stringify(query.toLowerCase())}));
    }
    if (!target) target = parsed[0] || null;
    if (!target) return {ok:false, reason:'no-target', sample:parsed.slice(0,40)};
    target.el.click();
    return {ok:true, exact:${exact ? 'true' : 'false'}, clicked:{aria:target.aria,text:target.text,title:target.title,parsedTitle:target.parsedTitle,normTitle:target.normTitle}};
  })()`);
  await sleep(2500);
  const st = await status(evalExpr);
  return { click, status: st };
}

async function main(){
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) {
    console.error('Usage: spotify_cdp.js <status|open-track|play-track|search|play-title|play-title-exact|pause|resume|next|previous|device-list> [args]');
    process.exit(2);
  }
  const releaseLock = await acquireLock();
  try {
    const tab = await ensureSpotify();
    const cdp = await connectTab(tab);
    try {
      let out;
      if (cmd === 'status') {
        out = await status(cdp.evalExpr);
      } else if (cmd === 'open-track') {
        const trackId = args[0];
        if (!trackId) throw new Error('trackId required');
        await openTrack(cdp.send, trackId);
        out = await status(cdp.evalExpr);
      } else if (cmd === 'play-track') {
        const trackId = args[0];
        if (!trackId) throw new Error('trackId required');
        await openTrack(cdp.send, trackId);
        const click = await clickPlayOnCurrent(cdp.evalExpr);
        await sleep(1500);
        out = { click, status: await status(cdp.evalExpr) };
      } else if (cmd === 'search') {
        const query = args.join(' ');
        if (!query) throw new Error('query required');
        out = await search(cdp.send, cdp.evalExpr, query);
      } else if (cmd === 'play-title') {
        const query = args.join(' ');
        if (!query) throw new Error('query required');
        out = await playTitle(cdp.send, cdp.evalExpr, query, false);
      } else if (cmd === 'play-title-exact') {
        const query = args.join(' ');
        if (!query) throw new Error('query required');
        out = await playTitle(cdp.send, cdp.evalExpr, query, true);
      } else if (cmd === 'pause' || cmd === 'resume' || cmd === 'next' || cmd === 'previous') {
        const click = await playbackAction(cdp.evalExpr, cmd);
        await sleep(1200);
        out = { click, status: await status(cdp.evalExpr) };
      } else if (cmd === 'device-list') {
        out = await listDevices(cdp.evalExpr);
      } else {
        throw new Error(`Unknown command: ${cmd}`);
      }
      console.log(JSON.stringify(out, null, 2));
    } finally {
      cdp.close();
    }
  } finally {
    releaseLock();
  }
}

main().catch(err => {
  console.error(err && err.stack || String(err));
  process.exit(1);
});
