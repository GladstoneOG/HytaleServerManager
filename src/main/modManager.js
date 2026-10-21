'use strict';
/**
 * Core Mod Manager for Hytale Dedicated Servers
 * Handles:
 * - Scanning installed mods (.jar) and reading manifest.json
 * - Checking mod status (enabled/disabled)
 * - Toggling mods (via .jar.disabled and config.json)
 * - Fingerprinting installed jars against CurseForge to detect updates
 * - One-click install from CurseForge (with dependency resolution)
 * - One-click install from Thunderstore
 * - One-click update for individual mods or batch update all
 * - Profiles: create, activate, export, import profiles (syncing with friends)
 */
const path = require('path');
const fsp = require('fs/promises');
const fs = require('fs');
const { readEntryText, readModManifest } = require('./zip');
const { readJson, writeJsonAtomic, exists, ensureDir, safeName, compareVersions } = require('./util');
const { downloadFile } = require('./http');

function selectBestCurseForgeFile(modObj, targetServerVersion = null, allowBeta = false) {
  if (!modObj || !Array.isArray(modObj.latestFiles) || modObj.latestFiles.length === 0) {
    return null;
  }
  const files = modObj.latestFiles;
  const branch = targetServerVersion ? String(targetServerVersion).split('.').slice(0, 2).join('.') : null;

  const isCompatible = (f) => {
    if (!branch && !targetServerVersion) return true;
    const gvs = f.gameVersions || [];
    if (gvs.length === 0) return true;
    return gvs.some((gv) => {
      const gvClean = String(gv).trim();
      const gvLower = gvClean.toLowerCase();
      if (gvClean === '*' || gvLower === 'all') return true;
      if (gvClean === targetServerVersion) return true;
      if (branch && (gvClean === branch || gvClean.startsWith(branch + '.') || gvClean.startsWith(branch + 'x'))) return true;
      if (branch && branch.toLowerCase() === 'early access' && gvLower === 'early access') return true;
      return false;
    });
  };

  // 1. Release file (releaseType === 1) that is compatible
  const relCompatible = files.filter((f) => f.releaseType === 1 && isCompatible(f));
  if (relCompatible.length > 0) return relCompatible[0];

  // 2. Any Release file (releaseType === 1)
  const anyRelease = files.filter((f) => f.releaseType === 1);
  if (anyRelease.length > 0) return anyRelease[0];

  // 3. If allowBeta is true (or mod has no release files at all), pick compatible then fallback
  if (allowBeta) {
    const betaCompatible = files.filter((f) => isCompatible(f));
    if (betaCompatible.length > 0) return betaCompatible[0];
  }

  // 4. Fallback to newest available file
  return files[0];
}

class ModManager {
  constructor({ serverDir = 'F:\\serverht\\Server', curseforgeClient, thunderstoreClient } = {}) {
    this.serverDir = serverDir;
    this.cf = curseforgeClient;
    this.ts = thunderstoreClient;
    this.metadataFile = path.join(this.serverDir, '.hytale_mod_manager.json');
    this.profilesDir = path.join(this.serverDir, '.mod_profiles');
    this._actionLocks = new Map();
  }

  async _withLock(key, fn) {
    while (this._actionLocks.has(key)) {
      await this._actionLocks.get(key);
    }
    let resolver;
    const p = new Promise((resolve) => { resolver = resolve; });
    this._actionLocks.set(key, p);
    try {
      return await fn();
    } finally {
      this._actionLocks.delete(key);
      resolver();
    }
  }

  setServerDir(dir) {
    this.serverDir = dir;
    this.metadataFile = path.join(this.serverDir, '.hytale_mod_manager.json');
    this.profilesDir = path.join(this.serverDir, '.mod_profiles');
  }

  get modsDir() {
    return path.join(this.serverDir, 'mods');
  }

  get configFile() {
    return path.join(this.serverDir, 'config.json');
  }

  /**
   * Load local manager metadata (tracks mod origins, CF IDs, TS namespaces, profiles)
   */
  async loadMetadata() {
    return await readJson(this.metadataFile, {
      activeProfile: 'Default',
      installedMods: {}, // fileName -> { source, id, fileId, version, name }
    });
  }

  async saveMetadata(data) {
    await writeJsonAtomic(this.metadataFile, data);
  }

  /**
   * Read server config.json
   */
  async readServerConfig() {
    return await readJson(this.configFile, {});
  }

  /**
   * Write server config.json
   */
  async writeServerConfig(cfg) {
    await writeJsonAtomic(this.configFile, cfg);
  }

  /**
   * Scan all mods in Server/mods directory
   */
  async getInstalledMods(checkRemoteUpdates = true) {
    await ensureDir(this.modsDir);
    const meta = await this.loadMetadata();
    const serverCfg = await this.readServerConfig();
    const configMods = serverCfg.Mods || {};

    let files = [];
    try {
      files = await fsp.readdir(this.modsDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const jarFiles = files.filter(
      (f) => f.isFile() && (f.name.endsWith('.jar') || f.name.endsWith('.jar.disabled'))
    );

    const installed = [];
    const filesToFingerprint = [];

    for (const f of jarFiles) {
      const fullPath = path.join(this.modsDir, f.name);
      const isFileDisabled = f.name.endsWith('.disabled');
      let stat;
      try { stat = await fsp.stat(fullPath); } catch { continue; }

      // Read internal manifest.json
      const manifest = (await readModManifest(fullPath)) || {};

      const modKey = manifest.Name || f.name.replace(/\.jar(\.disabled)?$/, '');
      const isConfigDisabled = configMods[modKey]?.Enabled === false;
      const isEnabled = !isFileDisabled && !isConfigDisabled;

      const savedMeta = meta.installedMods?.[f.name] || {};

      const item = {
        fileName: f.name,
        fullPath,
        size: stat.size,
        lastModified: stat.mtimeMs,
        isEnabled,
        manifest: {
          name: manifest.Name || f.name.replace(/\.jar(\.disabled)?$/, ''),
          version: manifest.Version || 'Unknown',
          description: manifest.Description || '',
          authors: manifest.Authors || [],
          dependencies: manifest.Dependencies || {},
          optionalDependencies: manifest.OptionalDependencies || {},
          website: manifest.Website || '',
          serverVersion: manifest.ServerVersion || '*',
          main: manifest.Main || '',
        },
        source: savedMeta.source || 'local',
        remoteId: savedMeta.remoteId || null,
        remoteVersion: savedMeta.remoteVersion || null,
        iconUrl: savedMeta.iconUrl || null,
        updateAvailable: false,
        latestRemoteFile: null,
      };

      installed.push(item);

      // If we don't know the remote origin, queue for fingerprinting against CurseForge
      if (!item.remoteId && this.cf) {
        filesToFingerprint.push(item);
      }
    }

    // Attempt remote fingerprint matching for unlinked jars
    if (filesToFingerprint.length > 0 && checkRemoteUpdates && this.cf) {
      try {
        const fpResults = await this.cf.matchFingerprintsBatch(
          filesToFingerprint.map((i) => i.fullPath)
        );

        for (const item of filesToFingerprint) {
          const match = fpResults.get(item.fullPath);
          if (match && match.file) {
            item.source = 'curseforge';
            item.remoteId = match.file.modId;
            item.curseforgeFileId = match.file.id;

            // Save in metadata
            meta.installedMods[item.fileName] = {
              source: 'curseforge',
              remoteId: match.file.modId,
              fileId: match.file.id,
              version: item.manifest.version,
              name: item.manifest.name,
            };

            // Check if latest files have newer version
            if (match.latestFiles && match.latestFiles.length > 0) {
              const latest = match.latestFiles[0];
              if (latest.id > match.file.id) {
                item.updateAvailable = true;
                item.latestRemoteFile = latest;
              }
            }
          }
        }
        await this.saveMetadata(meta);
      } catch {
        // Fingerprinting failure does not prevent listing
      }
    }

    // Check updates for already-identified CurseForge mods
    if (checkRemoteUpdates && this.cf) {
      let metaChanged = false;
      for (const item of installed) {
        if (item.source === 'curseforge' && item.remoteId) {
          try {
            const modInfo = await this.cf.getMod(item.remoteId);
            if (modInfo) {
              if (modInfo.logo?.thumbnailUrl && !item.iconUrl) {
                item.iconUrl = modInfo.logo.thumbnailUrl;
                if (!meta.installedMods[item.fileName]) meta.installedMods[item.fileName] = {};
                meta.installedMods[item.fileName].iconUrl = item.iconUrl;
                metaChanged = true;
              }
              if (modInfo.latestFiles && modInfo.latestFiles.length > 0 && !item.updateAvailable) {
                const latest = modInfo.latestFiles[0];
                const curVer = item.manifest.version;
                const newVer = latest.displayName || latest.fileName;
                if (item.curseforgeFileId && latest.id > item.curseforgeFileId) {
                  item.updateAvailable = true;
                  item.latestRemoteFile = latest;
                } else if (curVer && curVer !== 'Unknown' && newVer && !newVer.includes(curVer)) {
                  item.updateAvailable = true;
                  item.latestRemoteFile = latest;
                }
              }
            }
          } catch {
            // Ignore single mod update check error
          }
        }
      }
      if (metaChanged) {
        await this.saveMetadata(meta).catch(() => {});
      }
    }

    return installed;
  }

  /**
   * Enable or disable a mod atomically and idempotently
   */
  async setModEnabled(fileName, enable) {
    const baseName = fileName.replace(/\.disabled$/, '');
    return await this._withLock(baseName, async () => {
      const enabledFile = baseName;
      const disabledFile = `${baseName}.disabled`;
      const enabledPath = path.join(this.modsDir, enabledFile);
      const disabledPath = path.join(this.modsDir, disabledFile);

      const hasEnabled = await exists(enabledPath);
      const hasDisabled = await exists(disabledPath);

      let finalFile = enable ? enabledFile : disabledFile;
      let finalPath = path.join(this.modsDir, finalFile);

      if (enable) {
        if (hasDisabled && !hasEnabled) {
          await fsp.rename(disabledPath, enabledPath);
        }
      } else {
        if (hasEnabled && !hasDisabled) {
          await fsp.rename(enabledPath, disabledPath);
        }
      }

      // Verify the final file exists
      if (!await exists(finalPath)) {
        // Fallback: check if the original file still exists
        const origPath = path.join(this.modsDir, fileName);
        if (await exists(origPath)) {
          finalFile = fileName;
          finalPath = origPath;
        }
      }

      // Also update config.json Mods section for thoroughness
      try {
        const manifest = (await readModManifest(finalPath)) || {};
        const modKey = manifest.Name || baseName.replace(/\.jar$/, '');
        const cfg = await this.readServerConfig();
        if (!cfg.Mods) cfg.Mods = {};
        if (!cfg.Mods[modKey]) cfg.Mods[modKey] = {};
        cfg.Mods[modKey].Enabled = enable;
        await this.writeServerConfig(cfg);
      } catch {
        // Config update best effort
      }

      // Update metadata map key if renamed
      try {
        const meta = await this.loadMetadata();
        if (meta.installedMods) {
          const prevKey = meta.installedMods[fileName] ? fileName : (meta.installedMods[enabledFile] ? enabledFile : disabledFile);
          if (meta.installedMods[prevKey]) {
            meta.installedMods[finalFile] = meta.installedMods[prevKey];
            if (finalFile !== prevKey) {
              delete meta.installedMods[prevKey];
            }
            await this.saveMetadata(meta);
          }
        }
      } catch {}

      return { success: true, newFileName: finalFile, isEnabled: enable };
    });
  }

  /**
   * Delete an installed mod
   */
  async deleteMod(fileName, deleteConfigDir = false) {
    const filePath = path.join(this.modsDir, fileName);
    let manifest = null;
    try {
      manifest = await readModManifest(filePath);
    } catch {}

    if (await exists(filePath)) {
      await fsp.rm(filePath, { force: true });
    }

    // Remove from metadata
    const meta = await this.loadMetadata();
    if (meta.installedMods?.[fileName]) {
      delete meta.installedMods[fileName];
      await this.saveMetadata(meta);
    }

    // Optionally delete mod configuration folder (e.g., mods/com.claimchestqol_ClaimChestQOL)
    if (deleteConfigDir && manifest) {
      const groupName = manifest.Group ? `${manifest.Group}_${manifest.Name}` : manifest.Name;
      const configFolder = path.join(this.modsDir, groupName);
      if (await exists(configFolder)) {
        await fsp.rm(configFolder, { recursive: true, force: true });
      }
    }

    return { success: true };
  }

  /**
   * Install a mod from CurseForge by file
   */
  async installCurseForgeMod(modObj, fileObj, { onProgress, signal, installDeps = true } = {}) {
    if (!fileObj.downloadUrl) {
      // Re-query file if URL is missing
      const freshFile = await this.cf.getFile(modObj.id, fileObj.id);
      if (freshFile && freshFile.downloadUrl) {
        fileObj = freshFile;
      } else {
        throw new Error(`No direct download URL available for ${fileObj.fileName || modObj.name}`);
      }
    }

    await ensureDir(this.modsDir);
    const fileName = safeName(fileObj.fileName || `${modObj.name}.jar`);
    const targetPath = path.join(this.modsDir, fileName);

    onProgress?.({
      step: 'downloading',
      message: `Downloading ${modObj.name} (${fileName})...`,
    });

    await downloadFile(fileObj.downloadUrl, targetPath, {
      onProgress: (p) => {
        onProgress?.({
          step: 'downloading',
          message: `Downloading ${modObj.name}: ${p.done ? (p.done / 1024).toFixed(0) : 0} KB`,
          ...p,
        });
      },
      signal,
      retries: 5,
    });

    // Save in metadata
    const meta = await this.loadMetadata();
    if (!meta.installedMods) meta.installedMods = {};
    meta.installedMods[fileName] = {
      source: 'curseforge',
      remoteId: modObj.id,
      fileId: fileObj.id,
      name: modObj.name,
      version: fileObj.displayName || fileObj.fileName,
      iconUrl: modObj.logo?.thumbnailUrl || modObj.logo?.url || null,
      installedAt: Date.now(),
    };
    await this.saveMetadata(meta);

    // Resolve & install required dependencies if requested
    const installedDeps = [];
    if (installDeps && fileObj.dependencies && fileObj.dependencies.length > 0) {
      onProgress?.({
        step: 'dependencies',
        message: `Resolving dependencies for ${modObj.name}...`,
      });
      const deps = await this.cf.resolveDependencies(fileObj);
      for (const d of deps) {
        try {
          onProgress?.({
            step: 'dependencies',
            message: `Installing required dependency: ${d.mod.name}...`,
          });
          const depRes = await this.installCurseForgeMod(d.mod, d.latestFile, {
            onProgress,
            signal,
            installDeps: false, // Don't infinite-recurse
          });
          installedDeps.push(depRes);
        } catch (e) {
          console.warn(`Failed to auto-install dependency ${d.mod.name}:`, e.message);
        }
      }
    }

    onProgress?.({
      step: 'complete',
      modName: modObj.name,
      fileName,
      message: `Installed ${modObj.name}`,
    });

    return {
      success: true,
      fileName,
      targetPath,
      installedDeps,
    };
  }

  /**
   * Install a mod package from Thunderstore
   */
  async installThunderstoreMod(pkgInfo, { onProgress, signal } = {}) {
    onProgress?.({
      step: 'downloading',
      message: `Downloading Thunderstore package ${pkgInfo.name}...`,
    });

    const res = await this.ts.installPackage(pkgInfo, this.modsDir, {
      onProgress,
      signal,
    });

    // Update metadata for installed jars
    const meta = await this.loadMetadata();
    if (!meta.installedMods) meta.installedMods = {};

    for (const jarPath of res.installedJars) {
      const bname = path.basename(jarPath);
      meta.installedMods[bname] = {
        source: 'thunderstore',
        remoteId: `${res.namespace}/${res.name}`,
        name: pkgInfo.name,
        version: res.version,
        iconUrl: pkgInfo.icon_url || null,
        installedAt: Date.now(),
      };
    }
    await this.saveMetadata(meta);

    onProgress?.({
      step: 'complete',
      modName: pkgInfo.name,
      message: `Installed ${pkgInfo.name}`,
    });

    return {
      success: true,
      ...res,
    };
  }

  /**
   * Update an installed mod to its latest remote version
   */
  async updateMod(item, { onProgress, signal, targetServerVersion } = {}) {
    if (item.source === 'curseforge' && item.remoteId) {
      const modObj = await this.cf.getMod(item.remoteId);
      const latestFile = item.latestRemoteFile || selectBestCurseForgeFile(modObj, targetServerVersion, false);
      if (!latestFile) throw new Error(`No compatible release file found for ${item.manifest?.name || item.fileName}`);

      // Delete old jar
      await this.deleteMod(item.fileName, false);

      // Install new jar
      const res = await this.installCurseForgeMod(modObj, latestFile, { onProgress, signal });
      onProgress?.({
        step: 'complete',
        modName: item.manifest?.name || item.fileName,
        message: `Updated ${item.manifest?.name || item.fileName}`,
      });
      return res;
    } else if (item.source === 'thunderstore' && item.remoteId) {
      const [namespace, name] = item.remoteId.split('/');
      const detail = await this.ts.getPackageDetail(namespace, name);
      const pkgInfo = {
        namespace,
        name,
        version: detail.latest?.version_number,
      };

      // Delete old jar
      await this.deleteMod(item.fileName, false);

      // Install updated package
      const res = await this.installThunderstoreMod(pkgInfo, { onProgress, signal });
      onProgress?.({
        step: 'complete',
        modName: item.manifest?.name || item.fileName,
        message: `Updated ${item.manifest?.name || item.fileName}`,
      });
      return res;
    } else {
      throw new Error(`Mod ${item.manifest.name} does not have a connected update source.`);
    }
  }

  // ==========================================
  // PROFILE MANAGEMENT
  // ==========================================

  /**
   * List all saved profiles
   */
  async getProfiles() {
    await ensureDir(this.profilesDir);
    const meta = await this.loadMetadata();
    let entries = [];
    try {
      entries = await fsp.readdir(this.profilesDir, { withFileTypes: true });
    } catch {
      return [{ name: 'Default', active: true, modCount: 0 }];
    }

    const profiles = [];
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.json')) {
        const pPath = path.join(this.profilesDir, e.name);
        try {
          const pData = await readJson(pPath);
          profiles.push({
            name: pData.name || e.name.replace(/\.json$/, ''),
            description: pData.description || '',
            createdAt: pData.createdAt,
            updatedAt: pData.updatedAt,
            modCount: (pData.mods || []).length,
            active: meta.activeProfile === pData.name,
          });
        } catch {}
      }
    }

    if (profiles.length === 0) {
      profiles.push({ name: 'Default', active: true, modCount: 0 });
    }

    return profiles;
  }

  /**
   * Create a new profile snapshotting currently installed mods
   */
  async createProfile(name, description = '') {
    await ensureDir(this.profilesDir);
    const installed = await this.getInstalledMods(false);
    const safe = safeName(name);
    const profileFile = path.join(this.profilesDir, `${safe}.json`);

    const profileData = {
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mods: installed.map((m) => ({
        fileName: m.fileName,
        name: m.manifest.name,
        version: m.manifest.version,
        isEnabled: m.isEnabled,
        source: m.source,
        remoteId: m.remoteId,
      })),
    };

    await writeJsonAtomic(profileFile, profileData);
    return profileData;
  }

  /**
   * Activate a profile (enables/disables mods according to the profile)
   */
  async activateProfile(name) {
    const safe = safeName(name);
    const profileFile = path.join(this.profilesDir, `${safe}.json`);
    if (!(await exists(profileFile))) {
      throw new Error(`Profile ${name} does not exist`);
    }

    const profileData = await readJson(profileFile);
    const currentMods = await this.getInstalledMods(false);

    // Apply enabled/disabled state according to profile
    for (const pMod of profileData.mods || []) {
      const match = currentMods.find(
        (m) =>
          m.fileName === pMod.fileName ||
          m.manifest.name === pMod.name ||
          (pMod.remoteId && m.remoteId === pMod.remoteId)
      );

      if (match) {
        if (match.isEnabled !== pMod.isEnabled) {
          await this.setModEnabled(match.fileName, pMod.isEnabled);
        }
      }
    }

    // Save as active profile
    const meta = await this.loadMetadata();
    meta.activeProfile = name;
    await this.saveMetadata(meta);

    return { success: true, profileName: name };
  }

  /**
   * Export a profile to a standalone JSON file
   */
  async exportProfile(name, destFilePath) {
    const safe = safeName(name);
    const profileFile = path.join(this.profilesDir, `${safe}.json`);
    if (!(await exists(profileFile))) {
      throw new Error(`Profile ${name} does not exist`);
    }

    const data = await readJson(profileFile);
    await writeJsonAtomic(destFilePath, data);
    return destFilePath;
  }

  /**
   * Import a profile JSON and optionally auto-download missing mods from CurseForge / Thunderstore
   */
  async importProfile(profileJsonPath, { autoDownload = true, onProgress, signal } = {}) {
    const profileData = await readJson(profileJsonPath);
    if (!profileData || !profileData.name) {
      throw new Error('Invalid profile file: missing profile name');
    }

    const safe = safeName(profileData.name);
    await ensureDir(this.profilesDir);
    const targetFile = path.join(this.profilesDir, `${safe}.json`);
    await writeJsonAtomic(targetFile, profileData);

    const results = {
      profileName: profileData.name,
      installedCount: 0,
      downloadedCount: 0,
    };

    if (autoDownload) {
      const currentMods = await this.getInstalledMods(false);
      const modsToGet = profileData.mods || [];

      for (const m of modsToGet) {
        const alreadyHas = currentMods.some(
          (c) =>
            c.fileName === m.fileName ||
            c.manifest.name === m.name ||
            (m.remoteId && c.remoteId === m.remoteId)
        );

        if (!alreadyHas) {
          if (m.source === 'curseforge' && m.remoteId && this.cf) {
            try {
              onProgress?.({
                step: 'importing',
                message: `Importing mod from CurseForge: ${m.name}...`,
              });
              const modObj = await this.cf.getMod(m.remoteId);
              if (modObj && modObj.latestFiles && modObj.latestFiles.length > 0) {
                await this.installCurseForgeMod(modObj, modObj.latestFiles[0], { onProgress, signal });
                results.downloadedCount++;
              }
            } catch (e) {
              console.warn(`Failed to auto-download ${m.name}:`, e.message);
            }
          } else if (m.source === 'thunderstore' && m.remoteId && this.ts) {
            try {
              onProgress?.({
                step: 'importing',
                message: `Importing mod from Thunderstore: ${m.name}...`,
              });
              const [namespace, name] = m.remoteId.split('/');
              const detail = await this.ts.getPackageDetail(namespace, name);
              await this.installThunderstoreMod(
                { namespace, name, version: detail.latest?.version_number },
                { onProgress, signal }
              );
              results.downloadedCount++;
            } catch (e) {
              console.warn(`Failed to auto-download ${m.name}:`, e.message);
            }
          }
        }
      }
    }

    return results;
  }
}

module.exports = {
  ModManager,
  selectBestCurseForgeFile,
};
