'use strict';
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function exists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
  return p;
}

async function readJson(p, fallback = null) {
  try {
    const txt = await fsp.readFile(p, 'utf8');
    return JSON.parse(txt.replace(/^\uFEFF/, ''));
  } catch (e) {
    if (fallback !== null) return typeof fallback === 'function' ? fallback() : structuredClone(fallback);
    throw e;
  }
}

/** Write JSON atomically (write temp file, then rename over the target). */
async function writeJsonAtomic(p, data) {
  await ensureDir(path.dirname(p));
  const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await renameRetry(tmp, p);
}

/** fs.rename with retries — Windows AV/indexers sometimes hold files briefly. */
async function renameRetry(from, to, attempts = 8) {
  for (let i = 0; ; i++) {
    try { return await fsp.rename(from, to); } catch (e) {
      if (i >= attempts || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      await sleep(150 * (i + 1));
    }
  }
}

function hashFile(p, algo = 'sha1', onProgress) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algo);
    let done = 0;
    const s = fs.createReadStream(p, { highWaterMark: 4 * 1024 * 1024 });
    s.on('data', (c) => { h.update(c); done += c.length; if (onProgress) onProgress(done); });
    s.on('error', reject);
    s.on('end', () => resolve(h.digest('hex')));
  });
}

/** Make a string safe to use as a single path segment. */
function safeName(s) {
  return String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+$/g, '').slice(0, 180) || '_';
}

/** Ensure `child` resolves inside `parent` (zip-slip protection). */
function isInside(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function humanBytes(n) {
  if (!Number.isFinite(n)) return '?';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}

/** Compare dotted versions like "0.7.1" vs "0.7.2". Non-numeric parts compare lexicographically. */
function compareVersions(a, b) {
  const pa = String(a || '').split(/[.\-+]/);
  const pb = String(b || '').split(/[.\-+]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? '0', y = pb[i] ?? '0';
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    if (nx && ny) { const d = parseInt(x, 10) - parseInt(y, 10); if (d) return Math.sign(d); }
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** Simple serial queue so concurrent UI clicks can't corrupt state. */
class SerialQueue {
  constructor() { this.tail = Promise.resolve(); }
  run(fn) {
    const p = this.tail.then(fn, fn);
    this.tail = p.catch(() => {});
    return p;
  }
}

class UserError extends Error {
  constructor(message, code) { super(message); this.userFacing = true; this.code = code; }
}

module.exports = {
  sleep, exists, ensureDir, readJson, writeJsonAtomic, renameRetry, hashFile,
  safeName, isInside, humanBytes, compareVersions, SerialQueue, UserError,
};
