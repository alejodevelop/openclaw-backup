import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { normalizeSpanishTTS } from './text-normalize.mjs';

const PORT = Number(process.env.LOCAL_TTS_PORT || 8091);
const HOST = process.env.LOCAL_TTS_HOST || '127.0.0.1';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BIN_DIR = path.join(ROOT, 'bin', 'piper-dist');
const VOICES_DIR = path.join(ROOT, 'voices');
const TMP_DIR = path.join(ROOT, 'tmp');
const PIPER_BIN = process.env.PIPER_BIN || findPiperBin();
const FFMPEG_BIN = process.env.FFMPEG_BIN || '/home/acabarcas/.local/bin/ffmpeg';
const DEFAULT_VOICE = process.env.LOCAL_TTS_DEFAULT_VOICE || 'es_ES-davefx-medium';
const API_KEY = process.env.LOCAL_TTS_API_KEY || 'local-tts';

fs.mkdirSync(TMP_DIR, { recursive: true });

function findPiperBin() {
  const candidates = [
    path.join(BIN_DIR, 'piper', 'piper'),
    path.join(BIN_DIR, 'piper'),
    path.join(ROOT, 'bin', 'piper')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function contentTypeFor(format) {
  switch ((format || '').toLowerCase()) {
    case 'wav': return 'audio/wav';
    case 'pcm': return 'application/octet-stream';
    case 'opus': return 'audio/ogg';
    case 'mp3':
    default: return 'audio/mpeg';
  }
}

function voicePaths(voice) {
  const base = path.join(VOICES_DIR, voice, voice);
  return {
    model: `${base}.onnx`,
    config: `${base}.onnx.json`
  };
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = Buffer.alloc(0);
    let stderr = '';
    child.stdout.on('data', d => { stdout = Buffer.concat([stdout, d]); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(0, 800)}`));
    });
    if (opts.input != null) {
      child.stdin.write(opts.input);
    }
    child.stdin.end();
  });
}

async function synthesizeToWav({ text, voice }) {
  const v = voicePaths(voice);
  if (!fs.existsSync(v.model) || !fs.existsSync(v.config)) {
    throw new Error(`Voice not installed: ${voice}`);
  }
  if (!fs.existsSync(PIPER_BIN)) {
    throw new Error(`Piper binary not found: ${PIPER_BIN}`);
  }
  const outPath = path.join(TMP_DIR, `${randomUUID()}.wav`);
  await run(PIPER_BIN, ['--model', v.model, '--config', v.config, '--output_file', outPath], { input: text });
  return outPath;
}

async function transcode(inPath, format, profile = 'default') {
  const f = (format || 'mp3').toLowerCase();
  if (!fs.existsSync(FFMPEG_BIN)) throw new Error(`ffmpeg not found: ${FFMPEG_BIN}`);
  const outPath = path.join(TMP_DIR, `${randomUUID()}.${f === 'opus' ? 'ogg' : f}`);
  const filter = profile === 'deep_male'
    ? ['-af', 'asetrate=22050*0.92,aresample=24000,atempo=0.97,volume=1.12']
    : profile === 'male_serene'
      ? ['-af', 'asetrate=22050*0.95,aresample=24000,atempo=1.01,volume=1.06']
      : [];
  if (f === 'wav') {
    const args = ['-y', '-i', inPath, ...filter, outPath];
    await run(FFMPEG_BIN, args);
    return fs.readFileSync(outPath);
  }
  const argsByFormat = {
    mp3: ['-y', '-i', inPath, ...filter, '-vn', '-codec:a', 'libmp3lame', '-b:a', '48k', outPath],
    opus: ['-y', '-i', inPath, ...filter, '-vn', '-c:a', 'libopus', '-b:a', '24k', '-application', 'voip', outPath],
    pcm: ['-y', '-i', inPath, ...filter, '-f', 's16le', '-ac', '1', '-ar', '24000', outPath],
  };
  const args = argsByFormat[f] || argsByFormat.mp3;
  await run(FFMPEG_BIN, args);
  return fs.readFileSync(outPath);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/healthz') {
      return json(res, 200, { ok: true, piper: fs.existsSync(PIPER_BIN), defaultVoice: DEFAULT_VOICE });
    }
    if (req.method !== 'POST' || req.url !== '/audio/speech') {
      return json(res, 404, { error: 'not_found' });
    }
    const auth = req.headers['authorization'];
    if (API_KEY && auth !== `Bearer ${API_KEY}`) {
      return json(res, 401, { error: 'unauthorized' });
    }
    const body = await parseBody(req);
    const rawText = String(body.input || '').trim();
    const text = normalizeSpanishTTS(rawText);
    const voice = String(body.voice || DEFAULT_VOICE).trim();
    const responseFormat = String(body.response_format || 'mp3').trim().toLowerCase();
    const profile = String(body.profile || 'default').trim().toLowerCase();
    if (!text) return json(res, 400, { error: 'missing_input' });
    if (!['mp3', 'wav', 'opus', 'pcm'].includes(responseFormat)) {
      return json(res, 400, { error: 'unsupported_response_format', response_format: responseFormat });
    }

    const wavPath = await synthesizeToWav({ text, voice });
    const data = await transcode(wavPath, responseFormat, profile);
    res.writeHead(200, {
      'Content-Type': contentTypeFor(responseFormat),
      'Content-Length': data.length,
      'Cache-Control': 'no-store'
    });
    res.end(data);
  } catch (err) {
    json(res, 500, { error: 'tts_failed', detail: String(err?.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`local-tts listening on http://${HOST}:${PORT}`);
  console.log(`piper=${PIPER_BIN}`);
  console.log(`defaultVoice=${DEFAULT_VOICE}`);
});
