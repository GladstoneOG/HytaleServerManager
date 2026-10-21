'use strict';
/**
 * Thunderstore API Integration for Hytale
 * Community: "hytale"
 * Endpoints:
 * - https://thunderstore.io/api/cyberstorm/listing/hytale/
 * - https://thunderstore.io/api/experimental/package/{namespace}/{name}/
 * - https://thunderstore.io/package/download/{namespace}/{name}/{version}/
 */
const { getJson, downloadFile } = require('./http');
const { extract, listEntries } = require('./zip');
const path = require('path');
const fsp = require('fs/promises');
const os = require('os');
const { ensureDir } = require('./util');

const TS_BASE = 'https://thunderstore.io';
const COMMUNITY = 'hytale';

class ThunderstoreClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || TS_BASE;
    this.community = options.community || COMMUNITY;
    this._cache = null;
    this._cacheTime = 0;
  }

  /**
   * Fetch all package listings for Hytale from Thunderstore
   */
  async getPackages(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this._cache && now - this._cacheTime < 60000) {
      return this._cache;
    }

    const url = `${this.baseUrl}/api/cyberstorm/listing/${this.community}/?page_size=100`;
    const res = await getJson(url, { timeout: 15000 });
    const packages = res?.results || [];

    this._cache = packages;
    this._cacheTime = now;
    return packages;
  }

  /**
   * Search packages with in-memory filtering (since Thunderstore listing has all packages)
   */
  async searchPackages({
    searchFilter = '',
    category = '',
    sort = 'downloads', // 'downloads', 'updated', 'name'
  } = {}) {
    const pkgs = await this.getPackages();
    let filtered = pkgs;

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.namespace.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (category) {
      filtered = filtered.filter((p) =>
        (p.categories || []).some((c) => c.slug === category || c.name.toLowerCase() === category.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      if (sort === 'downloads') return (b.download_count || 0) - (a.download_count || 0);
      if (sort === 'updated') return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
      if (sort === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return filtered;
  }

  /**
   * Get package detail including version list and dependencies
   */
  async getPackageDetail(namespace, name) {
    const url = `${this.baseUrl}/api/experimental/package/${namespace}/${name}/`;
    return await getJson(url, { timeout: 15000 });
  }

  /**
   * Get download URL for specific version (or latest)
   */
  getDownloadUrl(namespace, name, version) {
    return `${this.baseUrl}/package/download/${namespace}/${name}/${version}/`;
  }

  /**
   * Download and install a Thunderstore package into the server mods directory.
   * Thunderstore packages are zips containing:
   * - manifest.json
   * - icon.png
   * - README.md
   * - and either .jar files at the root, or inside a `mods/` directory.
   */
  async installPackage(pkgInfo, serverModsDir, { onProgress, signal } = {}) {
    const namespace = pkgInfo.namespace;
    const name = pkgInfo.name;
    const version = pkgInfo.version || pkgInfo.latest?.version_number || pkgInfo.version_number;

    if (!version) throw new Error(`Could not determine version for Thunderstore package ${namespace}-${name}`);

    const dlUrl = this.getDownloadUrl(namespace, name, version);
    const tmpZip = path.join(os.tmpdir(), `ts_${namespace}_${name}_${version}_${Date.now()}.zip`);

    try {
      onProgress?.({
        step: 'downloading',
        modName: name,
        percent: 5,
        message: `Connecting to Thunderstore for ${name}...`,
      });

      await downloadFile(dlUrl, tmpZip, {
        onProgress: (p) => {
          const pct = p.percent ?? (p.total > 0 ? Math.round((p.done / p.total) * 100) : 0);
          onProgress?.({
            step: 'downloading',
            modName: name,
            percent: pct,
            message: `Downloading ${name} (${pct}%)...`,
            ...p,
          });
        },
        signal,
        retries: 5,
      });

      onProgress?.({
        step: 'extracting',
        modName: name,
        percent: 90,
        message: `Extracting ${name}...`,
      });

      // Inspect entries in zip to see where .jar files are located
      const entries = await listEntries(tmpZip);
      const jarEntries = entries.filter((e) => !e.dir && e.name.toLowerCase().endsWith('.jar'));

      if (jarEntries.length === 0) {
        throw new Error(`No .jar files found inside Thunderstore package ${name} (${version})`);
      }

      await ensureDir(serverModsDir);
      const installedJars = [];

      // Extract all .jar files directly into serverModsDir
      await extract(tmpZip, (entryName) => {
        if (!entryName.toLowerCase().endsWith('.jar')) return null;
        const basename = path.basename(entryName);
        const dest = path.join(serverModsDir, basename);
        installedJars.push(dest);
        return dest;
      });

      return {
        installedJars,
        version,
        namespace,
        name,
      };
    } finally {
      await fsp.rm(tmpZip, { force: true }).catch(() => {});
    }
  }
}

module.exports = {
  ThunderstoreClient,
  COMMUNITY,
};
