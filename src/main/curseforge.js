'use strict';
/**
 * CurseForge API Integration for Hytale (gameId: 70216)
 * Uses the high-performance public proxy endpoint which does not require an API key,
 * and falls back to official api.curseforge.com if user supplies a key.
 */
const { getJson, postJson, downloadFile } = require('./http');
const { curseforgeFingerprint } = require('./murmur2');

const DEFAULT_PROXY = 'https://cfproxy.bmpm.workers.dev';
const HYTALE_GAME_ID = 70216;
const MODS_CLASS_ID = 9137;

class CurseForgeClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_PROXY;
    this.apiKey = options.apiKey || null;
  }

  _headers() {
    const h = { 'Accept': 'application/json' };
    if (this.apiKey) {
      h['x-api-key'] = this.apiKey;
    }
    return h;
  }

  async searchMods({
    searchFilter = '',
    sortField = 2, // 1: Featured, 2: Popularity, 3: LastUpdated, 4: Name, 5: TotalDownloads
    sortOrder = 'desc',
    pageSize = 20,
    index = 0,
    categoryId = null,
    gameVersion = null,
  } = {}) {
    const params = new URLSearchParams({
      gameId: HYTALE_GAME_ID,
      classId: MODS_CLASS_ID,
      pageSize: String(pageSize),
      index: String(index),
      sortField: String(sortField),
      sortOrder: String(sortOrder),
    });

    if (searchFilter) params.set('searchFilter', searchFilter);
    if (categoryId) params.set('categoryId', String(categoryId));
    if (gameVersion) params.set('gameVersion', String(gameVersion));

    const url = `${this.baseUrl}/v1/mods/search?${params.toString()}`;
    const res = await getJson(url, { headers: this._headers(), timeout: 15000 });
    return {
      data: res?.data || [],
      pagination: res?.pagination || { totalCount: 0, index, pageSize },
    };
  }

  async getMod(modId) {
    const url = `${this.baseUrl}/v1/mods/${modId}`;
    const res = await getJson(url, { headers: this._headers(), timeout: 15000 });
    return res?.data || null;
  }

  async getModDescription(modId) {
    const url = `${this.baseUrl}/v1/mods/${modId}/description`;
    const res = await getJson(url, { headers: this._headers(), timeout: 15000 });
    return res?.data || '';
  }

  async getModFiles(modId, pageSize = 20, index = 0) {
    const url = `${this.baseUrl}/v1/mods/${modId}/files?pageSize=${pageSize}&index=${index}`;
    const res = await getJson(url, { headers: this._headers(), timeout: 15000 });
    return res?.data || [];
  }

  async getFile(modId, fileId) {
    const url = `${this.baseUrl}/v1/mods/${modId}/files/${fileId}`;
    const res = await getJson(url, { headers: this._headers(), timeout: 15000 });
    return res?.data || null;
  }

  async getCategories() {
    const url = `${this.baseUrl}/v1/categories?gameId=${HYTALE_GAME_ID}`;
    const res = await getJson(url, { headers: this._headers(), timeout: 15000 });
    const all = res?.data || [];
    return all.filter((c) => c.classId === MODS_CLASS_ID || c.id === MODS_CLASS_ID);
  }

  /**
   * Match an existing local jar file against CurseForge database using Murmur2 fingerprint.
   * Returns matching file metadata or null.
   */
  async matchFingerprint(jarPath) {
    try {
      const fp = await curseforgeFingerprint(jarPath);
      const url = `${this.baseUrl}/v1/fingerprints/${HYTALE_GAME_ID}`;
      const res = await postJson(url, { fingerprints: [fp] }, { headers: this._headers(), timeout: 15000 });
      const exact = res?.data?.exactMatches || [];
      if (exact.length > 0) {
        return exact[0]; // { id, file: { id, modId, fileName, ... }, latestFiles }
      }
      return null;
    } catch (e) {
      // Fingerprint match is best-effort
      return null;
    }
  }

  /**
   * Match multiple jar paths in batch
   */
  async matchFingerprintsBatch(jarPaths) {
    const fpMap = new Map();
    for (const p of jarPaths) {
      try {
        const fp = await curseforgeFingerprint(p);
        fpMap.set(fp, p);
      } catch {
        // ignore unreadable
      }
    }
    if (fpMap.size === 0) return new Map();

    const fingerprints = Array.from(fpMap.keys());
    try {
      const url = `${this.baseUrl}/v1/fingerprints/${HYTALE_GAME_ID}`;
      const res = await postJson(url, { fingerprints }, { headers: this._headers(), timeout: 20000 });
      const exact = res?.data?.exactMatches || [];
      const results = new Map();
      for (const m of exact) {
        const filePath = fpMap.get(m.file?.fileFingerprint || m.id);
        if (filePath) {
          results.set(filePath, m);
        }
      }
      return results;
    } catch {
      return new Map();
    }
  }

  /**
   * Resolve dependencies for a specific file.
   * Returns array of { modId, relationType, name, file }
   */
  async resolveDependencies(fileObj) {
    const deps = fileObj.dependencies || [];
    const required = deps.filter((d) => d.relationType === 3); // 3 = RequiredDependency in CF
    if (required.length === 0) return [];

    const resolved = [];
    for (const d of required) {
      try {
        const mod = await this.getMod(d.modId);
        if (mod && mod.latestFiles && mod.latestFiles.length > 0) {
          resolved.push({
            modId: d.modId,
            relationType: d.relationType,
            mod,
            latestFile: mod.latestFiles[0],
          });
        }
      } catch {
        // Ignore single dep lookup error
      }
    }
    return resolved;
  }
}

module.exports = {
  CurseForgeClient,
  HYTALE_GAME_ID,
  MODS_CLASS_ID,
};
