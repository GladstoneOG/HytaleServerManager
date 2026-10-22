'use strict';
/**
 * Hytale Server Authentication & Credential Store Management
 * 
 * Handles:
 * - Portable Server Auth Key (HYTALE_AUTH_KEY & auth.enc.key):
 *   Ensures servers migrated or cloned between different computers/hostnames
 *   can decrypt and refresh their credentials without hardware-UUID mismatches.
 * - Server Authentication Status detection (decoding auth.enc)
 * - Monitoring console auth prompts (/auth login device)
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { exists } = require('./util');

const PBKDF2_SALT = Buffer.from('HytaleAuthCredentialStore', 'utf8');
const PBKDF2_ITERATIONS = 100000;
const KEY_LEN_BYTES = 32;

/**
 * Ensure the server has a persistent, portable auth key.
 * Written to auth.enc.key (native Hytale server keyfile location) and .hytale_auth_key.
 */
async function ensureServerAuthKey(serverDir) {
  if (!serverDir) return null;

  const keyFilePath = path.join(serverDir, 'auth.enc.key');
  const backupKeyPath = path.join(serverDir, '.hytale_auth_key');

  if (await exists(keyFilePath)) {
    try {
      const content = (await fsp.readFile(keyFilePath, 'utf8')).trim();
      if (content) {
        if (!(await exists(backupKeyPath))) {
          await fsp.writeFile(backupKeyPath, content, 'utf8').catch(() => {});
        }
        return content;
      }
    } catch {}
  }

  if (await exists(backupKeyPath)) {
    try {
      const content = (await fsp.readFile(backupKeyPath, 'utf8')).trim();
      if (content) {
        await fsp.writeFile(keyFilePath, content, 'utf8').catch(() => {});
        return content;
      }
    } catch {}
  }

  // Generate a new secure UUID key (Hytale standard format)
  const newKey = crypto.randomUUID();
  try {
    await fsp.writeFile(keyFilePath, newKey, 'utf8');
    await fsp.writeFile(backupKeyPath, newKey, 'utf8').catch(() => {});
  } catch {}

  return newKey;
}

/**
 * Attempt to decrypt auth.enc using candidate keys (HYTALE_AUTH_KEY, auth.enc.key, etc.)
 */
function readServerStoredCredentials(serverDir, authKey = null) {
  if (!serverDir) return { exists: false, authenticated: false };

  const encPath = path.join(serverDir, 'auth.enc');
  if (!fs.existsSync(encPath)) {
    return { exists: false, authenticated: false };
  }

  let encData;
  try {
    encData = fs.readFileSync(encPath);
  } catch (e) {
    return { exists: true, authenticated: false, error: e.message };
  }

  if (encData.length < 28) {
    return { exists: true, authenticated: false, error: 'File size too small' };
  }

  const iv = encData.subarray(0, 12);
  const tag = encData.subarray(encData.length - 16);
  const ciphertext = encData.subarray(12, encData.length - 16);

  const candidates = [];
  if (authKey) candidates.push(authKey);

  const keyFilePath = path.join(serverDir, 'auth.enc.key');
  if (fs.existsSync(keyFilePath)) {
    try {
      const k = fs.readFileSync(keyFilePath, 'utf8').trim();
      if (k && !candidates.includes(k)) candidates.push(k);
    } catch {}
  }

  const backupKeyPath = path.join(serverDir, '.hytale_auth_key');
  if (fs.existsSync(backupKeyPath)) {
    try {
      const k = fs.readFileSync(backupKeyPath, 'utf8').trim();
      if (k && !candidates.includes(k)) candidates.push(k);
    } catch {}
  }

  let decrypted = null;
  let usedKey = null;

  for (const pass of candidates) {
    try {
      const key = crypto.pbkdf2Sync(pass, PBKDF2_SALT, PBKDF2_ITERATIONS, KEY_LEN_BYTES, 'sha256');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      usedKey = pass;
      break;
    } catch {}
  }

  if (!decrypted) {
    return {
      exists: true,
      authenticated: false,
      error: 'Decryption failed: credentials encrypted with different machine hardware UUID or missing auth key',
    };
  }

  const decStr = decrypted.toString('utf8');
  const tokenMatch = /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/.exec(decStr);
  const refreshTokenMatch = /(ory_rt_[A-Za-z0-9._-]+)/.exec(decStr);
  const uuidMatch = /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/.exec(decStr);

  let jwtClaims = null;
  if (tokenMatch) {
    try {
      const payloadB64 = tokenMatch[0].split('.')[1];
      jwtClaims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {}
  }

  return {
    exists: true,
    authenticated: true,
    usedKey,
    hasAccessToken: !!tokenMatch,
    hasRefreshToken: !!refreshTokenMatch,
    profileUuid: uuidMatch ? uuidMatch[1] : (jwtClaims ? jwtClaims.sub : null),
    clientId: jwtClaims ? jwtClaims.client_id : 'hytale-server',
    expiresAt: jwtClaims && jwtClaims.exp ? new Date(jwtClaims.exp * 1000).toISOString() : null,
    isExpired: jwtClaims && jwtClaims.exp ? Date.now() >= jwtClaims.exp * 1000 : false,
  };
}

/**
 * Get high-level summary of server auth status
 */
async function getServerAuthSummary(serverDir, currentAuthMode = 'authenticated') {
  const authKey = await ensureServerAuthKey(serverDir);
  const creds = readServerStoredCredentials(serverDir, authKey);

  let statusText = 'Not Authenticated';
  if (currentAuthMode === 'insecure') {
    statusText = 'Insecure Mode (Auth bypassed)';
  } else if (creds.authenticated) {
    statusText = 'Authenticated (Ready for remote players)';
  } else if (creds.exists) {
    statusText = 'Decryption Failed (Key mismatch)';
  } else {
    statusText = 'Not Authenticated (Remote players cannot join)';
  }

  return {
    authMode: currentAuthMode,
    authKeyPresent: Boolean(authKey),
    authKey: authKey ? `${authKey.substring(0, 8)}...` : null,
    fullAuthKey: authKey,
    authStoreExists: creds.exists,
    authenticated: creds.authenticated,
    profileUuid: creds.profileUuid || null,
    expiresAt: creds.expiresAt || null,
    isExpired: creds.isExpired || false,
    hasRefreshToken: creds.hasRefreshToken || false,
    statusText,
    error: creds.error || null,
  };
}

module.exports = {
  ensureServerAuthKey,
  readServerStoredCredentials,
  getServerAuthSummary,
};
