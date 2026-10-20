'use strict';
/**
 * HTTP helpers built on Node's global fetch: JSON with retries, and a robust
 * resumable file downloader (HTTP Range) with progress + hash verification.
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { Readable } = require('stream');
const { sleep, ensureDir, hashFile, renameRetry } = require('./util');

const USER_AGENT = 'HytaleServerManager/0.1 (+https://github.com/)';

class HttpError extends Error {
  constructor(status, url, body) {
    super(`HTTP ${status} for ${redact(url)}${body ? `: ${String(body).slice(0, 300)}` : ''}`);
    this.status = status;
    this.body = body;
  }
}

function redact(url) {
  return String(url).replace(/([?&](X-Amz-[^=]+|X-Goog-[^=]+|Signature|token|key)=)[^&]+/gi, '$1…');
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504, 520, 522, 524]);

async function request(url, opts = {}) {
  const {
    method = 'GET', headers = {}, body, json, retries = 3, timeout = 30000, raw = false,
  } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(new Error(`Request timed out after ${timeout}ms`)), timeout);
    try {
      const h = { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers };
      let payload = body;
      if (json !== undefined) { payload = JSON.stringify(json); h['Content-Type'] = 'application/json'; }
      const res = await fetch(url, { method, headers: h, body: payload, signal: ctl.signal, redirect: 'follow' });
      if (raw) { clearTimeout(t); return res; }
      const text = await res.text();
      clearTimeout(t);
      if (!res.ok) {
        const err = new HttpError(res.status, url, text);
        if (RETRYABLE.has(res.status) && attempt < retries) { lastErr = err; await sleep(backoff(attempt)); continue; }
        throw err;
      }
      if (!text) return null;
      try { return JSON.parse(text); } catch { return text; }
    } catch (e) {
      clearTimeout(t);
      if (e instanceof HttpError) throw e;
      lastErr = e;
      if (attempt < retries) { await sleep(backoff(attempt)); continue; }
    }
  }
  throw lastErr;
}

const backoff = (attempt) => Math.min(15000, 600 * 2 ** attempt) + Math.random() * 300;

const getJson = (url, opts) => request(url, { ...opts, method: 'GET' });
const postJson = (url, json, opts) => request(url, { ...opts, method: 'POST', json });
const postForm = (url, form, opts = {}) => request(url, {
  ...opts,
  method: 'POST',
  body: new URLSearchParams(form).toString(),
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(opts.headers || {}) },
});

/**
 * Download a file with resume support.
 * @param {string|function():Promise<string>} urlOrProvider  A URL or an async function returning a
 *        (fresh) URL — used for short-lived signed URLs which are re-requested on every attempt.
 * @param {string} dest final path
 * @param {object} o  { onProgress({done,total,speed}), sha256, sha1, size, retries, headers, signal }
 */
async function downloadFile(urlOrProvider, dest, o = {}) {
  const { onProgress, retries = 12, headers = {}, signal } = o;
  await ensureDir(path.dirname(dest));
  const part = `${dest}.part`;
  let total = o.size || 0;
  let lastErr;
  let lastTick = 0, lastBytes = 0, speed = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new Error('Download cancelled');
    let have = 0;
    try { have = (await fsp.stat(part)).size; } catch { /* none */ }
    if (total && have > total) { await fsp.rm(part, { force: true }); have = 0; }
    if (total && have === total) break;

    const url = typeof urlOrProvider === 'function' ? await urlOrProvider() : urlOrProvider;
    const ctl = new AbortController();
    const onAbort = () => ctl.abort(new Error('Download cancelled'));
    signal?.addEventListener('abort', onAbort);
    let idle;
    const armIdle = () => { clearTimeout(idle); idle = setTimeout(() => ctl.abort(new Error('Stalled: no data for 45s')), 45000); };
    try {
      armIdle();
      const h = { 'User-Agent': USER_AGENT, ...headers };
      if (have > 0) h.Range = `bytes=${have}-`;
      const res = await fetch(url, { headers: h, signal: ctl.signal, redirect: 'follow' });
      if (res.status === 416) { // range not satisfiable -> probably already complete
        if (have > 0) { total = total || have; break; }
      }
      if (!res.ok) throw new HttpError(res.status, url, await res.text().catch(() => ''));
      let append = false;
      if (res.status === 206) {
        append = true;
        const cr = res.headers.get('content-range');
        const m = cr && /\/(\d+)$/.exec(cr);
        if (m) total = parseInt(m[1], 10);
      } else {
        have = 0; // server ignored range: restart
        const len = parseInt(res.headers.get('content-length') || '0', 10);
        if (len) total = len;
      }
      const out = fs.createWriteStream(part, { flags: append ? 'a' : 'w' });
      let done = have;
      const stream = Readable.fromWeb(res.body);
      await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => {
          armIdle();
          done += chunk.length;
          if (!out.write(chunk)) { stream.pause(); out.once('drain', () => stream.resume()); }
          const now = Date.now();
          if (now - lastTick > 400) {
            if (lastTick) speed = ((done - lastBytes) * 1000) / (now - lastTick);
            lastTick = now; lastBytes = done;
            onProgress?.({ done, total, speed });
          }
        });
        stream.on('error', (e) => { out.destroy(); reject(e); });
        stream.on('end', () => out.end(resolve));
        out.on('error', reject);
      });
      clearTimeout(idle);
      signal?.removeEventListener('abort', onAbort);
      const size = (await fsp.stat(part)).size;
      if (!total || size >= total) { total = total || size; break; }
      lastErr = new Error(`Connection closed early (${size}/${total})`);
    } catch (e) {
      clearTimeout(idle);
      signal?.removeEventListener('abort', onAbort);
      if (signal?.aborted) throw new Error('Download cancelled');
      lastErr = e;
      if (e instanceof HttpError && e.status >= 400 && e.status < 500 && ![403, 408, 429].includes(e.status)) throw e;
    }
    if (attempt === retries) throw new Error(`Download failed after ${retries + 1} attempts: ${lastErr?.message || lastErr}`);
    onProgress?.({ done: have, total, speed: 0, retrying: attempt + 1, error: String(lastErr?.message || lastErr) });
    await sleep(backoff(Math.min(attempt, 4)));
  }

  onProgress?.({ done: total, total, speed, verifying: !!(o.sha256 || o.sha1) });
  if (o.sha256 || o.sha1) {
    const algo = o.sha256 ? 'sha256' : 'sha1';
    const want = (o.sha256 || o.sha1).toLowerCase();
    const got = await hashFile(part, algo);
    if (got !== want) {
      await fsp.rm(part, { force: true });
      throw new Error(`Checksum mismatch for ${path.basename(dest)} (${algo} expected ${want.slice(0, 12)}…, got ${got.slice(0, 12)}…). Partial file removed, please retry.`);
    }
  }
  await fsp.rm(dest, { force: true });
  await renameRetry(part, dest);
  return dest;
}

module.exports = { request, getJson, postJson, postForm, downloadFile, HttpError, USER_AGENT, redact };
