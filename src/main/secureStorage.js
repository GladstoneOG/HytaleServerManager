'use strict';
/**
 * Secure Credential Storage for Hytale Server Manager
 * - Uses Electron's safeStorage (DPAPI on Windows) when available
 * - Transparent authenticated AES-256-GCM encryption fallback for headless/Node environments
 * - Automatically migrates legacy plaintext .hytale-downloader-credentials.json to encrypted .enc
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exists, writeJsonAtomic } = require('./util');

let electronSafeStorage = null;
try {
  const electron = require('electron');
  if (electron && electron.safeStorage && electron.safeStorage.isEncryptionAvailable()) {
    electronSafeStorage = electron.safeStorage;
  }
} catch {
  // Headless Node environment
}

// Derive a machine/user-bound key for fallback AES-256-GCM encryption
function getFallbackKey() {
  const user = os.userInfo?.()?.username || 'user';
  const host = os.hostname() || 'localhost';
  const seed = `${user}@${host}::hytale-auth-v1`;
  return crypto.pbkdf2Sync(seed, 'hytale-salt-v1-storage', 100000, 32, 'sha256');
}

/**
 * Encrypt a plaintext string into a secure Buffer with type header
 */
function encryptData(plainText) {
  if (electronSafeStorage) {
    try {
      const encrypted = electronSafeStorage.encryptString(plainText);
      const prefix = Buffer.from('SAFE:');
      return Buffer.concat([prefix, encrypted]);
    } catch {
      // Fallback if safeStorage encounters an error
    }
  }

  // Fallback: AES-256-GCM
  const key = getFallbackKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const prefix = Buffer.from('GCM:');
  return Buffer.concat([prefix, iv, tag, enc]);
}

/**
 * Decrypt a secure Buffer into a plaintext string
 */
function decryptData(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) {
    throw new Error('Invalid encrypted buffer format');
  }

  const prefix = buffer.subarray(0, 5).toString('utf8');
  const payload = buffer.subarray(5);

  if (prefix === 'SAFE:' && electronSafeStorage) {
    return electronSafeStorage.decryptString(payload);
  }

  if (prefix === 'GCM:' || buffer.subarray(0, 4).toString('utf8') === 'GCM:') {
    const raw = buffer.subarray(4);
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const key = getFallbackKey();

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  // Attempt raw safeStorage decrypt
  if (electronSafeStorage) {
    try {
      return electronSafeStorage.decryptString(buffer);
    } catch {}
  }

  throw new Error('Unable to decrypt credentials (unrecognized format or key)');
}

/**
 * Load credentials securely from .enc file or auto-migrate from legacy .json
 */
async function loadSecureCredentials(baseFileCandidate) {
  const encFile = baseFileCandidate.endsWith('.enc')
    ? baseFileCandidate
    : baseFileCandidate.replace(/\.json$/, '.enc');
  const jsonFile = baseFileCandidate.endsWith('.json')
    ? baseFileCandidate
    : baseFileCandidate.replace(/\.enc$/, '.json');

  // 1. Try encrypted file first
  if (await exists(encFile)) {
    try {
      const encryptedBuf = await fsp.readFile(encFile);
      const jsonText = decryptData(encryptedBuf);
      const parsed = JSON.parse(jsonText);
      return { credentials: parsed, filePath: encFile, encrypted: true };
    } catch (e) {
      console.warn(`[Auth] Failed to decrypt ${encFile}:`, e.message);
    }
  }

  // 2. Fallback to legacy plaintext .json and immediately migrate it
  if (await exists(jsonFile)) {
    try {
      const rawText = await fsp.readFile(jsonFile, 'utf8');
      const parsed = JSON.parse(rawText);

      // Save encrypted file immediately
      await saveSecureCredentials(encFile, parsed);

      // Securely wipe plaintext JSON file
      try {
        const zeroes = Buffer.alloc(rawText.length, 0);
        await fsp.writeFile(jsonFile, zeroes);
        await fsp.unlink(jsonFile);
        console.log(`[Auth] Successfully migrated and wiped legacy plaintext ${jsonFile}`);
      } catch (err) {
        console.warn(`[Auth] Failed to delete legacy plaintext file: ${err.message}`);
      }

      return { credentials: parsed, filePath: encFile, encrypted: true, migrated: true };
    } catch (e) {
      console.warn(`[Auth] Failed to read legacy ${jsonFile}:`, e.message);
    }
  }

  return { credentials: null, filePath: null, encrypted: false };
}

/**
 * Save credentials securely as encrypted .enc file
 */
async function saveSecureCredentials(targetFile, credentialsObj) {
  const encFile = targetFile.endsWith('.enc')
    ? targetFile
    : targetFile.replace(/\.json$/, '.enc');

  const jsonText = JSON.stringify(credentialsObj, null, 2);
  const encryptedBuf = encryptData(jsonText);

  const tmpPath = `${encFile}.tmp.${Date.now()}`;
  await fsp.writeFile(tmpPath, encryptedBuf);
  await fsp.rename(tmpPath, encFile);

  return encFile;
}

module.exports = {
  loadSecureCredentials,
  saveSecureCredentials,
  encryptData,
  decryptData,
};
