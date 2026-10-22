'use strict';
/**
 * Hytale Account & Downloader Authentication Integration
 * Handles:
 * - Reading existing .hytale-downloader-credentials.json
 * - OAuth token refresh
 * - OAuth 2.0 Device Code login flow (user opens link in browser, tool polls and completes)
 * - Fetching version manifests and signed download URLs from account-data.hytale.com
 */
const path = require('path');
const fsp = require('fs/promises');
const os = require('os');
const { getJson, postForm, postJson, request } = require('./http');
const { readJson, writeJsonAtomic, exists, sleep } = require('./util');
const { loadSecureCredentials, saveSecureCredentials } = require('./secureStorage');

const OAUTH_BASE = 'https://oauth.accounts.hytale.com';
const ASSETS_BASE = 'https://account-data.hytale.com';
const DEFAULT_CLIENT_ID = 'hytale-downloader';
const DEFAULT_SCOPE = 'openid offline auth:downloader';

class HytaleAuthManager {
  constructor(options = {}) {
    this.serverDir = options.serverDir || 'F:\\serverht\\Server';
    this.credentialsPath = options.credentialsPath || null;
    this._credentials = null;
    this._pollingAbort = null;
  }

  setServerDir(dir) {
    this.serverDir = dir;
    this.credentialsPath = null;
    this._credentials = null;
  }

  /**
   * Find .hytale-downloader-credentials.enc or legacy .json across server, userData, and home directories
   */
  async findCredentialsFile() {
    if (this.credentialsPath && await exists(this.credentialsPath)) {
      return this.credentialsPath;
    }

    const candidates = [];

    // 1. Check Electron userData directory (%APPDATA%\hytale-server-manager)
    try {
      const { app } = require('electron');
      if (app && app.getPath) {
        const userData = app.getPath('userData');
        if (userData) {
          candidates.push(path.join(userData, '.hytale-downloader-credentials.enc'));
          candidates.push(path.join(userData, '.hytale-downloader-credentials.json'));
        }
      }
    } catch {}

    // 2. Check server directory and safe parent directory (avoiding root drive like C:\)
    if (this.serverDir) {
      candidates.push(path.join(this.serverDir, '.hytale-downloader-credentials.enc'));
      candidates.push(path.join(this.serverDir, '.hytale-downloader-credentials.json'));

      const parentDir = path.dirname(this.serverDir);
      if (parentDir && parentDir !== this.serverDir && path.dirname(parentDir) !== parentDir) {
        candidates.push(path.join(parentDir, '.hytale-downloader-credentials.enc'));
        candidates.push(path.join(parentDir, '.hytale-downloader-credentials.json'));
      }
    }

    // 3. Check user profile / home directory
    try {
      const home = os.homedir();
      if (home) {
        candidates.push(path.join(home, '.hytale', '.hytale-downloader-credentials.enc'));
        candidates.push(path.join(home, '.hytale', '.hytale-downloader-credentials.json'));
        candidates.push(path.join(home, '.hytale-downloader-credentials.enc'));
        candidates.push(path.join(home, '.hytale-downloader-credentials.json'));
      }
    } catch {}

    // 4. Default standard locations
    candidates.push('F:\\serverht\\.hytale-downloader-credentials.enc');
    candidates.push('F:\\serverht\\.hytale-downloader-credentials.json');

    for (const c of candidates) {
      if (await exists(c)) {
        this.credentialsPath = c;
        return c;
      }
    }
    return null;
  }

  /**
   * Load credentials securely from encrypted file or legacy plaintext
   */
  async loadCredentials(force = false) {
    if (this._credentials && !force) return this._credentials;

    const file = await this.findCredentialsFile();
    if (!file) {
      this._credentials = null;
      return null;
    }

    try {
      const res = await loadSecureCredentials(file);
      if (res && res.credentials) {
        this._credentials = res.credentials;
        this.credentialsPath = res.filePath;
        return this._credentials;
      }
      this._credentials = null;
      return null;
    } catch {
      this._credentials = null;
      return null;
    }
  }

  /**
   * Save credentials securely as an encrypted file
   */
  async saveCredentials(creds) {
    let file = await this.findCredentialsFile();
    if (!file) {
      // 1. Prefer serverDir if exists
      if (this.serverDir && (await exists(this.serverDir))) {
        file = path.join(this.serverDir, '.hytale-downloader-credentials.enc');
      } else {
        // 2. Prefer Electron userData (always writable for current user)
        try {
          const { app } = require('electron');
          if (app && app.getPath) {
            const userData = app.getPath('userData');
            if (userData) {
              file = path.join(userData, '.hytale-downloader-credentials.enc');
            }
          }
        } catch {}

        // 3. Fallback to os.homedir()
        if (!file) {
          file = path.join(os.homedir(), '.hytale-downloader-credentials.enc');
        }
      }
    }

    const savedPath = await saveSecureCredentials(file, creds);
    this.credentialsPath = savedPath;
    this._credentials = creds;
    return savedPath;
  }

  /**
   * Get valid access token, auto-refreshing if expired or within 2 minutes of expiry
   */
  async getValidToken() {
    let creds = await this.loadCredentials();
    if (!creds || !creds.access_token) {
      throw new Error('Not authenticated with Hytale. Please connect your Hytale account.');
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = creds.expires_at || 0;

    // If token expires in less than 120 seconds and we have a refresh_token, refresh it
    if (expiresAt && (expiresAt - now < 120) && creds.refresh_token) {
      try {
        creds = await this.refreshToken(creds.refresh_token);
      } catch (e) {
        // If refresh fails, check if access token is still technically valid
        if (expiresAt <= now) {
          throw new Error(`Hytale token expired and refresh failed: ${e.message}`);
        }
      }
    }

    return creds.access_token;
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(refreshToken) {
    const url = `${OAUTH_BASE}/oauth2/token`;
    const form = {
      grant_type: 'refresh_token',
      client_id: DEFAULT_CLIENT_ID,
      refresh_token: refreshToken,
    };

    const res = await postForm(url, form, { timeout: 15000 });
    if (!res || !res.access_token) {
      throw new Error('OAuth token refresh failed: invalid response');
    }

    const now = Math.floor(Date.now() / 1000);
    const updated = {
      ...this._credentials,
      access_token: res.access_token,
      refresh_token: res.refresh_token || refreshToken,
      expires_at: now + (res.expires_in || 3600),
      branch: this._credentials?.branch || 'release',
    };

    await this.saveCredentials(updated);
    return updated;
  }

  /**
   * Start OAuth 2.0 Device Code Flow
   * Returns: { user_code, verification_uri, verification_uri_complete, device_code, expires_in, interval }
   */
  async startDeviceLogin({ clientId = DEFAULT_CLIENT_ID, scope = DEFAULT_SCOPE } = {}) {
    const url = `${OAUTH_BASE}/oauth2/device/auth`;
    const res = await postForm(url, {
      client_id: clientId,
      scope: scope,
    }, { timeout: 15000 });

    if (!res || !res.device_code) {
      throw new Error(`Device auth request failed: ${JSON.stringify(res)}`);
    }

    return {
      clientId,
      device_code: res.device_code,
      user_code: res.user_code,
      verification_uri: res.verification_uri,
      verification_uri_complete: res.verification_uri_complete,
      expires_in: res.expires_in || 600,
      interval: res.interval || 5,
    };
  }

  /**
   * Poll for Device Code login completion
   */
  async pollDeviceLogin(deviceAuth, { onPoll, signal } = {}) {
    const { device_code, clientId = DEFAULT_CLIENT_ID, interval = 5, expires_in = 600 } = deviceAuth;
    const deadline = Date.now() + expires_in * 1000;
    let pollInterval = Math.max(interval, 3) * 1000;

    const tokenUrl = `${OAUTH_BASE}/oauth2/token`;

    while (Date.now() < deadline) {
      if (signal?.aborted) throw new Error('Login cancelled');

      await sleep(pollInterval);
      if (signal?.aborted) throw new Error('Login cancelled');

      try {
        onPoll?.({ status: 'checking' });
        const res = await postForm(tokenUrl, {
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          client_id: clientId,
          device_code: device_code,
        }, { retries: 0, timeout: 10000 });

        if (res && res.access_token) {
          const now = Math.floor(Date.now() / 1000);
          const creds = {
            access_token: res.access_token,
            refresh_token: res.refresh_token,
            expires_at: now + (res.expires_in || 3600),
            branch: 'release',
          };
          await this.saveCredentials(creds);
          return creds;
        }

        if (res?.error === 'authorization_pending') {
          continue;
        } else if (res?.error === 'slow_down') {
          pollInterval += 5000;
          continue;
        } else if (res?.error) {
          throw new Error(`Login failed: ${res.error_description || res.error}`);
        }
      } catch (e) {
        if (e.message && e.message.includes('authorization_pending')) {
          continue;
        }
        if (e.message && e.message.includes('slow_down')) {
          pollInterval += 5000;
          continue;
        }
        // Non-terminal HTTP errors continue polling until timeout
      }
    }

    throw new Error('Device login expired. Please try again.');
  }

  /**
   * Fetch game version manifest for given patchline (default "release")
   */
  async getVersionManifest(patchline = 'release') {
    const token = await this.getValidToken();
    const url = `${ASSETS_BASE}/game-assets/version/${patchline}.json`;

    const res = await getJson(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    // If endpoint returned a redirect or signed URL JSON wrapper:
    if (res?.url) {
      // Follow signed manifest URL
      return await getJson(res.url, { timeout: 15000 });
    }

    return res;
  }

  /**
   * Fetch signed download URL for a game update package (e.g., builds/release/0.7.2.zip)
   */
  async getSignedDownloadUrl(buildPath) {
    const token = await this.getValidToken();
    const cleanPath = String(buildPath).replace(/^\/+/, '');
    const url = `${ASSETS_BASE}/game-assets/${cleanPath}`;

    const res = await getJson(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    if (!res || !res.url) {
      throw new Error(`Failed to retrieve signed download URL for ${buildPath}`);
    }

    return res.url;
  }

  /**
   * Try to detect the local player name from the official Hytale launcher log if present
   */
  async getLocalPlayerName() {
    try {
      const appData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : null);
      if (!appData) return null;
      const logPath = path.join(appData, 'Hytale', 'hytale-launcher.log');
      if (await exists(logPath)) {
        const content = await fsp.readFile(logPath, 'utf8');
        const m = /--name\s+([A-Za-z0-9_]+)/.exec(content) || /user\s+([A-Za-z0-9_]+)/.exec(content);
        if (m && m[1]) return m[1];
      }
    } catch {}
    return null;
  }

  /**
   * Query OpenID Connect userinfo endpoint
   */
  async fetchUserInfo(accessToken) {
    try {
      return await getJson(`${OAUTH_BASE}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 8000,
      });
    } catch {
      return null;
    }
  }

  /**
   * Resolve account display name and email
   */
  async resolveAccountProfile(creds) {
    let username = creds.username || null;
    let email = creds.email || null;

    if (!username) {
      username = await this.getLocalPlayerName();
    }

    if (!email && creds.access_token) {
      const info = await this.fetchUserInfo(creds.access_token);
      if (info) {
        email = info.email || null;
        if (!username) {
          username = info.name || info.preferred_username || (info.email ? info.email.split('@')[0] : null);
        }
      }
    }

    if (!username && email) {
      username = email.split('@')[0];
    }

    if ((username && username !== creds.username) || (email && email !== creds.email)) {
      creds.username = username;
      creds.email = email;
      await this.saveCredentials(creds).catch(() => {});
    }

    return { username, email };
  }

  /**
   * Get account status summary, automatically refreshing token if expired
   */
  async getStatus() {
    let creds = await this.loadCredentials();
    if (!creds || !creds.access_token) {
      return { authenticated: false, credentialsPath: this.credentialsPath };
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = creds.expires_at || 0;
    let isExpired = expiresAt > 0 && expiresAt <= now;

    // Automatically refresh OAuth token in the background if expired or close to expiry (< 5 min)
    if ((isExpired || (expiresAt > 0 && expiresAt - now < 300)) && creds.refresh_token) {
      try {
        creds = await this.refreshToken(creds.refresh_token);
        isExpired = false;
      } catch (e) {
        console.warn('[Auth] Automatic token refresh failed during getStatus:', e.message);
      }
    }

    const profile = await this.resolveAccountProfile(creds);

    return {
      authenticated: true,
      credentialsPath: this.credentialsPath,
      branch: creds.branch || 'release',
      expiresAt: creds.expires_at,
      isExpired,
      hasRefreshToken: !!creds.refresh_token,
      username: profile.username || 'Hytale Player',
      email: profile.email || null,
    };
  }
}

module.exports = {
  HytaleAuthManager,
  DEFAULT_CLIENT_ID,
};
