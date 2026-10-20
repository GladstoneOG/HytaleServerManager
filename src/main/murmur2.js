'use strict';
/**
 * CurseForge file fingerprint: MurmurHash2 (32-bit, seed 1) over the file bytes with
 * whitespace bytes (0x09, 0x0A, 0x0D, 0x20) removed. Used with POST /v1/fingerprints
 * to identify mods that were copied into the server by hand.
 */
const fsp = require('fs/promises');

function murmur2(buf, seed = 1) {
  const m = 0x5bd1e995;
  let len = buf.length;
  let h = (seed ^ len) >>> 0;
  let i = 0;
  while (len >= 4) {
    let k = buf[i] | (buf[i + 1] << 8) | (buf[i + 2] << 16) | (buf[i + 3] << 24);
    k = Math.imul(k, m);
    k ^= k >>> 24;
    k = Math.imul(k, m);
    h = Math.imul(h, m) ^ k;
    i += 4;
    len -= 4;
  }
  switch (len) {
    case 3: h ^= buf[i + 2] << 16; // fallthrough
    case 2: h ^= buf[i + 1] << 8; // fallthrough
    case 1: h ^= buf[i]; h = Math.imul(h, m);
  }
  h ^= h >>> 13;
  h = Math.imul(h, m);
  h ^= h >>> 15;
  return h >>> 0;
}

function normalize(buf) {
  const out = Buffer.allocUnsafe(buf.length);
  let n = 0;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b !== 9 && b !== 10 && b !== 13 && b !== 32) out[n++] = b;
  }
  return out.subarray(0, n);
}

async function curseforgeFingerprint(filePath) {
  const buf = await fsp.readFile(filePath);
  return murmur2(normalize(buf), 1);
}

module.exports = { murmur2, normalize, curseforgeFingerprint };
