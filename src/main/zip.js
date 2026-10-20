'use strict';
/** Zip helpers on top of yauzl (supports zip64, needed for the 1.7 GB server package). */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const yauzl = require('yauzl');
const { ensureDir, isInside } = require('./util');

function open(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: false, decodeStrings: true, strictFileNames: false }, (err, zf) => (err ? reject(err) : resolve(zf)));
  });
}

async function listEntries(zipPath) {
  const zf = await open(zipPath);
  try {
    return await new Promise((resolve, reject) => {
      const out = [];
      zf.on('entry', (e) => { out.push({ name: e.fileName, size: e.uncompressedSize, dir: /\/$/.test(e.fileName) }); zf.readEntry(); });
      zf.on('end', () => resolve(out));
      zf.on('error', reject);
      zf.readEntry();
    });
  } finally { zf.close(); }
}

/** Read a single entry as text. `matcher` is a name or predicate(name). Returns null if absent. */
async function readEntryText(zipPath, matcher) {
  const test = typeof matcher === 'function' ? matcher : (n) => n.toLowerCase() === String(matcher).toLowerCase();
  const zf = await open(zipPath);
  try {
    return await new Promise((resolve, reject) => {
      let found = false;
      zf.on('entry', (e) => {
        if (!found && test(e.fileName)) {
          found = true;
          zf.openReadStream(e, (err, rs) => {
            if (err) return reject(err);
            const chunks = [];
            rs.on('data', (c) => chunks.push(c));
            rs.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            rs.on('error', reject);
          });
        } else zf.readEntry();
      });
      zf.on('end', () => { if (!found) resolve(null); });
      zf.on('error', reject);
      zf.readEntry();
    });
  } finally {
    // close after resolution; yauzl tolerates close while idle
    setTimeout(() => { try { zf.close(); } catch { /* ignore */ } }, 0);
  }
}

/** Read and parse the Hytale mod manifest.json at the root of a jar/zip. */
async function readModManifest(filePath) {
  try {
    const txt = await readEntryText(filePath, (n) => n.toLowerCase() === 'manifest.json');
    if (!txt) return null;
    return JSON.parse(txt.replace(/^\uFEFF/, ''));
  } catch { return null; }
}

/**
 * Extract entries. `map(entryName)` returns a destination path (absolute) or null to skip.
 * onProgress({ done, total, entry }) is reported in uncompressed bytes.
 */
async function extract(zipPath, map, onProgress) {
  const entries = await listEntries(zipPath);
  const total = entries.reduce((a, e) => a + (map(e.name) && !e.dir ? e.size : 0), 0);
  const zf = await open(zipPath);
  let done = 0;
  const written = [];
  try {
    await new Promise((resolve, reject) => {
      zf.on('entry', async (e) => {
        try {
          const dest = map(e.fileName);
          if (!dest || /\/$/.test(e.fileName)) { zf.readEntry(); return; }
          await ensureDir(path.dirname(dest));
          zf.openReadStream(e, (err, rs) => {
            if (err) return reject(err);
            const tmp = `${dest}.extracting`;
            const ws = fs.createWriteStream(tmp);
            let last = 0;
            rs.on('data', (c) => {
              done += c.length;
              const now = Date.now();
              if (onProgress && now - last > 300) { last = now; onProgress({ done, total, entry: e.fileName }); }
            });
            rs.on('error', reject);
            ws.on('error', reject);
            ws.on('finish', async () => {
              try {
                await fsp.rm(dest, { force: true, recursive: false });
                await fsp.rename(tmp, dest);
                written.push(dest);
                zf.readEntry();
              } catch (x) { reject(x); }
            });
            rs.pipe(ws);
          });
        } catch (x) { reject(x); }
      });
      zf.on('end', resolve);
      zf.on('error', reject);
      zf.readEntry();
    });
  } finally { zf.close(); }
  onProgress?.({ done: total, total });
  return written;
}

/** Build a safe mapper that strips `prefix` and places files under destDir. */
function prefixMapper(prefix, destDir) {
  return (name) => {
    if (prefix && !name.startsWith(prefix)) return null;
    const rel = name.slice(prefix.length);
    if (!rel) return null;
    const dest = path.join(destDir, ...rel.split('/'));
    return isInside(destDir, dest) ? dest : null;
  };
}

module.exports = { listEntries, readEntryText, readModManifest, extract, prefixMapper };
