'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcTarget = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcTarget);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    scanlines[rowOffset] = 0; // Filter None
    const srcRowOffset = y * width * 4;
    rgbaBuffer.copy(scanlines, rowOffset + 1, srcRowOffset, srcRowOffset + width * 4);
  }

  const deflated = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Convert 32x32 RGBA buffer into a valid Windows .ICO file
function createIcoFromPng(pngBuffer, width, height) {
  // ICO Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = Icon
  header.writeUInt16LE(1, 4); // Count 1 image

  // Icon Directory Entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry[0] = width >= 256 ? 0 : width;
  entry[1] = height >= 256 ? 0 : height;
  entry[2] = 0; // Color count
  entry[3] = 0; // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32BE(pngBuffer.length, 8); // Image size (LE) -> wait, writeUInt32LE!
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12); // Offset = 6 + 16 = 22

  return Buffer.concat([header, entry, pngBuffer]);
}

// Generate the Hytale Server Manager Emblem (Stylized Glowing Crystal Crest)
// High contrast colors: Glowing cyan (#00d2ff), Vibrant Emerald (#10b981), Golden Amber (#f59e0b)
function renderHytaleIcon(size = 32) {
  const buf = Buffer.alloc(size * size * 4);

  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    // Alpha blending
    const existingA = buf[idx + 3] / 255;
    const newA = a / 255;
    const outA = newA + existingA * (1 - newA);
    if (outA > 0) {
      buf[idx] = Math.round((r * newA + buf[idx] * existingA * (1 - newA)) / outA);
      buf[idx + 1] = Math.round((g * newA + buf[idx + 1] * existingA * (1 - newA)) / outA);
      buf[idx + 2] = Math.round((b * newA + buf[idx + 2] * existingA * (1 - newA)) / outA);
      buf[idx + 3] = Math.round(outA * 255);
    }
  }

  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 32;

  // Draw shield background / crest base
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / scale;
      const dy = (y - cy) / scale;

      // Shield boundary equation
      // Top flat/curved, bottom tapering to a point
      const inShield = dy >= -13 && dy <= 14 && Math.abs(dx) <= (dy < 2 ? 12 : 12 - (dy - 2) * 0.95);

      if (inShield) {
        // Outer border: Bright Gold (#f59e0b)
        const isBorder =
          dy <= -11 ||
          Math.abs(dx) >= (dy < 2 ? 10.5 : 10.5 - (dy - 2) * 0.95) ||
          dy >= 12;

        if (isBorder) {
          setPixel(x, y, 245, 158, 11, 255); // Gold
        } else {
          // Inside shield: Deep slate navy
          const grad = Math.min(1, Math.max(0, (dy + 12) / 24));
          const r = Math.round(15 + grad * 10);
          const g = Math.round(23 + grad * 15);
          const b = Math.round(42 + grad * 25);
          setPixel(x, y, r, g, b, 255);
        }
      }
    }
  }

  // Draw Hytale Diamond/Crystal Monogram "H" in center with glowing Cyan (#00e5ff) & Emerald (#10b981)
  // Left pillar of H
  for (let y = Math.round(cy - 7 * scale); y <= Math.round(cy + 7 * scale); y++) {
    for (let x = Math.round(cx - 7 * scale); x <= Math.round(cx - 4 * scale); x++) {
      setPixel(x, y, 0, 229, 255, 255);
    }
  }
  // Right pillar of H
  for (let y = Math.round(cy - 7 * scale); y <= Math.round(cy + 7 * scale); y++) {
    for (let x = Math.round(cx + 4 * scale); x <= Math.round(cx + 7 * scale); x++) {
      setPixel(x, y, 0, 229, 255, 255);
    }
  }
  // Center crossbar of H
  for (let y = Math.round(cy - 2 * scale); y <= Math.round(cy + 1 * scale); y++) {
    for (let x = Math.round(cx - 4 * scale); x <= Math.round(cx + 4 * scale); x++) {
      setPixel(x, y, 16, 185, 129, 255); // Emerald green
    }
  }
  // Center glowing emerald power core (small diamond)
  for (let y = Math.round(cy - 4 * scale); y <= Math.round(cy + 3 * scale); y++) {
    for (let x = Math.round(cx - 3 * scale); x <= Math.round(cx + 3 * scale); x++) {
      const d = Math.abs(x - cx) + Math.abs(y - cy);
      if (d <= 3 * scale) {
        setPixel(x, y, 52, 211, 153, 255); // Mint emerald glow
      }
      if (d <= 1.5 * scale) {
        setPixel(x, y, 255, 255, 255, 255); // White hot core
      }
    }
  }

  // Corner highlights on the gold shield top corners
  setPixel(Math.round(cx - 12 * scale), Math.round(cy - 12 * scale), 253, 230, 138, 255);
  setPixel(Math.round(cx + 12 * scale), Math.round(cy - 12 * scale), 253, 230, 138, 255);

  return buf;
}

function main() {
  const assetsDir = __dirname;

  // 1. Generate 32x32 crisp tray icon PNG
  const rgba32 = renderHytaleIcon(32);
  const png32 = createPng(32, 32, rgba32);
  const trayIconPath = path.join(assetsDir, 'tray-icon.png');
  fs.writeFileSync(trayIconPath, png32);
  console.log(`✓ Wrote ${trayIconPath} (${png32.length} bytes)`);

  // 2. Generate 16x16 tray icon PNG
  const rgba16 = renderHytaleIcon(16);
  const png16 = createPng(16, 16, rgba16);
  const trayIcon16Path = path.join(assetsDir, 'tray-icon-16.png');
  fs.writeFileSync(trayIcon16Path, png16);
  console.log(`✓ Wrote ${trayIcon16Path} (${png16.length} bytes)`);

  // 3. Generate native Windows .ICO file
  const icoData = createIcoFromPng(png32, 32, 32);
  const icoPath = path.join(assetsDir, 'tray-icon.ico');
  fs.writeFileSync(icoPath, icoData);
  console.log(`✓ Wrote ${icoPath} (${icoData.length} bytes)`);

  // 4. Generate app window icon (64x64)
  const rgba64 = renderHytaleIcon(64);
  const png64 = createPng(64, 64, rgba64);
  const iconPath = path.join(assetsDir, 'icon.png');
  fs.writeFileSync(iconPath, png64);
  console.log(`✓ Wrote ${iconPath} (${png64.length} bytes)`);
}

main();
