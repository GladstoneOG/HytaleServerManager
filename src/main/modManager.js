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
      if (gvLower === 'early access') return true;
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
    this.restorePointDir = path.join(this.serverDir, '.restore_point');
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
    this.restorePointDir = path.join(this.serverDir, '.restore_point');
  }

  get modsDir() {
    return path.join(this.serverDir, 'mods');
  }

  get configFile() {
    return path.join(this.serverDir, 'config.json');
  }

  /**
   * Detect current installed version by inspecting HytaleServer.jar
   */
  async getServerVersion() {
    const jarPath = path.join(this.serverDir, 'HytaleServer.jar');
    if (await exists(jarPath)) {
      try {
        const manifestText = await readEntryText(jarPath, 'META-INF/MANIFEST.MF');
        if (manifestText) {
          const match = manifestText.match(/Implementation-Version:\s*([^\r\n]+)/i);
          if (match && match[1].trim()) {
            return match[1].trim();
          }
        }
      } catch {}
    }
    return '0.7.1';
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
   * Ensure config.json Mods section only contains valid <group>:<name> identifiers
   * and strips any malformed legacy keys that crash HytaleServer on startup.
   */
  async sanitizeServerConfig() {
    try {
      const cfg = await this.readServerConfig();
      if (!cfg || !cfg.Mods || typeof cfg.Mods !== 'object') return;
      let modified = false;
      for (const key of Object.keys(cfg.Mods)) {
        if (!key.includes(':')) {
          delete cfg.Mods[key];
          modified = true;
        }
      }
      if (modified) {
        await this.writeServerConfig(cfg);
      }
    } catch {
      // Best effort
    }
  }

  /**
   * Scan all mods in Server/mods directory
   */
  async getInstalledMods(checkRemoteUpdates = true) {
    await ensureDir(this.modsDir);
    await this.sanitizeServerConfig();
    const meta = await this.loadMetadata();
    const serverCfg = await this.readServerConfig();
    const configMods = serverCfg.Mods || {};

    let files = [];
    try {
      files = await fsp.readdir(this.modsDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const modFiles = files.filter(
      (f) =>
        f.isFile() &&
        (f.name.endsWith('.jar') ||
          f.name.endsWith('.jar.disabled') ||
          f.name.endsWith('.zip') ||
          f.name.endsWith('.zip.disabled'))
    );

    const installed = [];
    const filesToFingerprint = [];

    for (const f of modFiles) {
      const fullPath = path.join(this.modsDir, f.name);
      const isFileDisabled = f.name.endsWith('.disabled');
      let stat;
      try { stat = await fsp.stat(fullPath); } catch { continue; }

      // Read internal manifest.json
      const manifest = (await readModManifest(fullPath)) || {};

      const modIdentifier = (manifest.Group && manifest.Name) ? `${manifest.Group}:${manifest.Name}` : null;
      const isConfigDisabled = Boolean(modIdentifier && configMods[modIdentifier]?.Enabled === false);
      const isEnabled = !isFileDisabled && !isConfigDisabled;

      const savedMeta = meta.installedMods?.[f.name] || {};

      const item = {
        fileName: f.name,
        fullPath,
        size: stat.size,
        lastModified: stat.mtimeMs,
        isEnabled,
        manifest: {
          name: manifest.Name || f.name.replace(/\.(jar|zip)(\.disabled)?$/, ''),
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
        curseforgeFileId: savedMeta.fileId || null,
        remoteVersion: savedMeta.remoteVersion || null,
        gameVersions: savedMeta.gameVersions || [],
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

    const serverVersion = await this.getServerVersion();

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
              gameVersions: match.file.gameVersions || [],
            };
            item.gameVersions = match.file.gameVersions || [];

            // Check if latest files have newer version (compatible Release build)
            if (match.latestFiles && match.latestFiles.length > 0) {
              const bestFile = selectBestCurseForgeFile({ latestFiles: match.latestFiles }, serverVersion, false);
              if (bestFile && bestFile.id > match.file.id && safeName(bestFile.fileName) !== safeName(item.fileName)) {
                item.updateAvailable = true;
                item.latestRemoteFile = bestFile;
              }
            }
          }
        }
        await this.saveMetadata(meta);
      } catch {
        // Fingerprinting failure does not prevent listing
      }
    }

    // Check updates for already-identified CurseForge & Thunderstore mods
    if (checkRemoteUpdates) {
      let metaChanged = false;
      for (const item of installed) {
        if (item.source === 'curseforge' && item.remoteId && this.cf) {
          try {
            const modInfo = await this.cf.getMod(item.remoteId);
            if (modInfo) {
              if (modInfo.logo?.thumbnailUrl && !item.iconUrl) {
                item.iconUrl = modInfo.logo.thumbnailUrl;
                if (!meta.installedMods[item.fileName]) meta.installedMods[item.fileName] = {};
                meta.installedMods[item.fileName].iconUrl = item.iconUrl;
                metaChanged = true;
              }

              // Backfill gameVersions if missing from metadata
              if (!item.gameVersions || item.gameVersions.length === 0) {
                let matchFile = null;
                if (item.curseforgeFileId && modInfo.latestFiles) {
                  matchFile = modInfo.latestFiles.find((f) => f.id === item.curseforgeFileId);
                }
                if (!matchFile && modInfo.latestFiles) {
                  matchFile = modInfo.latestFiles.find((f) => safeName(f.fileName) === safeName(item.fileName));
                }
                if (matchFile && matchFile.gameVersions && matchFile.gameVersions.length > 0) {
                  item.gameVersions = matchFile.gameVersions;
                } else if (modInfo.latestFilesIndexes && modInfo.latestFilesIndexes.length > 0) {
                  const idx = modInfo.latestFilesIndexes.find(
                    (i) => (item.curseforgeFileId && i.fileId === item.curseforgeFileId) || (i.filename && safeName(i.filename) === safeName(item.fileName))
                  );
                  if (idx && idx.gameVersion) {
                    item.gameVersions = [idx.gameVersion];
                  }
                }
                if ((!item.gameVersions || item.gameVersions.length === 0) && modInfo.latestFiles && modInfo.latestFiles.length > 0) {
                  item.gameVersions = modInfo.latestFiles[0].gameVersions || [];
                }

                if (item.gameVersions && item.gameVersions.length > 0) {
                  if (!meta.installedMods[item.fileName]) meta.installedMods[item.fileName] = {};
                  meta.installedMods[item.fileName].gameVersions = item.gameVersions;
                  metaChanged = true;
                }
              }
              if (modInfo.latestFiles && modInfo.latestFiles.length > 0 && !item.updateAvailable) {
                const bestFile = selectBestCurseForgeFile(modInfo, serverVersion, false);
                if (bestFile) {
                  const isSameFile =
                    (item.curseforgeFileId && bestFile.id === item.curseforgeFileId) ||
                    safeName(bestFile.fileName) === safeName(item.fileName);

                  if (!isSameFile) {
                    const isIdNewer = item.curseforgeFileId ? bestFile.id > item.curseforgeFileId : false;
                    const curVer = item.manifest.version;
                    const newVer = bestFile.displayName || bestFile.fileName;
                    const isVerNewer = (curVer && curVer !== 'Unknown')
                      ? compareVersions(newVer, curVer) > 0
                      : false;

                    if (isIdNewer || isVerNewer) {
                      item.updateAvailable = true;
                      item.latestRemoteFile = bestFile;
                    }
                  }
                }
              }
            }
          } catch {
            // Ignore single mod update check error
          }
        } else if (item.source === 'thunderstore' && item.remoteId && this.ts) {
          try {
            const [namespace, name] = item.remoteId.split('/');
            const detail = await this.ts.getPackageDetail(namespace, name);
            if (detail && detail.latest?.version_number) {
              const latestVer = detail.latest.version_number;
              const curVer = item.manifest.version || item.remoteVersion;
              if (curVer && curVer !== 'Unknown' && compareVersions(latestVer, curVer) > 0) {
                item.updateAvailable = true;
                item.latestRemoteFile = detail.latest;
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

      // Also update config.json Mods section safely if valid Group:Name exists
      try {
        const manifest = (await readModManifest(finalPath)) || {};
        if (manifest.Group && manifest.Name) {
          const modKey = `${manifest.Group}:${manifest.Name}`;
          const cfg = await this.readServerConfig();
          if (!cfg.Mods) cfg.Mods = {};
          if (enable) {
            // DefaultModsEnabled: true in Hytale enables all .jar files by default.
            // Removing from config.json keeps config.json clean and canonical.
            delete cfg.Mods[modKey];
          } else {
            cfg.Mods[modKey] = { Enabled: false };
          }
          // Remove any malformed non-colon keys to prevent server crash
          for (const k of Object.keys(cfg.Mods)) {
            if (!k.includes(':')) delete cfg.Mods[k];
          }
          await this.writeServerConfig(cfg);
        } else {
          await this.sanitizeServerConfig();
        }
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
  async installCurseForgeMod(modObj, fileObj, { onProgress, signal, installDeps = true, targetServerVersion = null } = {}) {
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
      modName: modObj.name,
      fileName,
      percent: 5,
      message: `Downloading ${modObj.name}...`,
    });

    await downloadFile(fileObj.downloadUrl, targetPath, {
      size: fileObj.fileLength || 0,
      onProgress: (p) => {
        const pct = p.percent ?? (p.total > 0 ? Math.round((p.done / p.total) * 100) : 0);
        onProgress?.({
          step: 'downloading',
          modName: modObj.name,
          fileName,
          percent: pct,
          message: `Downloading ${modObj.name} (${pct}%)...`,
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
      gameVersions: fileObj.gameVersions || [],
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
          // Check if dependency is already installed in the server
          const currentMeta = await this.loadMetadata();
          const alreadyInstalled = Object.values(currentMeta.installedMods || {}).some(
            (m) => m.remoteId === d.mod.id || (m.name || '').toLowerCase() === (d.mod.name || '').toLowerCase()
          );
          if (alreadyInstalled) {
            continue;
          }

          // Pick the best compatible Release file matching the server version
          const targetVer = targetServerVersion || (fileObj.gameVersions && fileObj.gameVersions[0]) || null;
          const depFile = selectBestCurseForgeFile(d.mod, targetVer, false) || d.latestFile;

          onProgress?.({
            step: 'dependencies',
            message: `Installing required dependency: ${d.mod.name}...`,
          });
          const depRes = await this.installCurseForgeMod(d.mod, depFile, {
            onProgress,
            signal,
            installDeps: false, // Don't infinite-recurse
            targetServerVersion: targetVer,
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

  // ==========================================
  // RESTORE POINT MANAGEMENT
  // ==========================================

  /**
   * Get metadata about the latest restore point
   */
  async getRestorePointInfo() {
    const infoPath = path.join(this.restorePointDir, 'restore_info.json');
    if (!(await exists(infoPath))) {
      return { exists: false };
    }
    try {
      const data = await readJson(infoPath);
      if (!data || !data.createdAt) return { exists: false };
      return {
        exists: true,
        createdAt: data.createdAt,
        reason: data.reason || 'Automatic backup',
        serverVersion: data.serverVersion || '0.7.1',
        modCount: (data.mods || []).length,
        enabledCount: (data.mods || []).filter((m) => m.isEnabled).length,
        disabledCount: (data.mods || []).filter((m) => !m.isEnabled).length,
        mods: data.mods || [],
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Create a restore point snapshot (server configs + mod list and statuses)
   */
  async createRestorePoint(reason = 'Last successful server launch') {
    await ensureDir(this.restorePointDir);
    const currentMods = await this.getInstalledMods(false);
    const serverVersion = await this.getServerVersion();

    // Backup config.json if it exists
    if (await exists(this.configFile)) {
      try {
        await fsp.copyFile(this.configFile, path.join(this.restorePointDir, 'config.json.backup'));
      } catch {}
    }

    // Backup metadata if it exists
    if (await exists(this.metadataFile)) {
      try {
        await fsp.copyFile(this.metadataFile, path.join(this.restorePointDir, 'metadata.json.backup'));
      } catch {}
    }

    const restoreInfo = {
      createdAt: Date.now(),
      reason,
      serverVersion,
      mods: currentMods.map((m) => ({
        fileName: m.fileName,
        name: m.manifest.name,
        version: m.manifest.version,
        isEnabled: m.isEnabled,
        source: m.source,
        remoteId: m.remoteId,
        size: m.size,
      })),
    };

    await writeJsonAtomic(path.join(this.restorePointDir, 'restore_info.json'), restoreInfo);
    return {
      success: true,
      createdAt: restoreInfo.createdAt,
      reason: restoreInfo.reason,
      modCount: restoreInfo.mods.length,
    };
  }

  /**
   * Restore server config and mod states to last known good restore point
   */
  async restoreLastKnownGoodState() {
    const infoPath = path.join(this.restorePointDir, 'restore_info.json');
    if (!(await exists(infoPath))) {
      throw new Error('No restore point found to restore from');
    }

    const restoreData = await readJson(infoPath);
    if (!restoreData || !Array.isArray(restoreData.mods)) {
      throw new Error('Restore point data is corrupted or incomplete');
    }

    // Restore config.json
    const configBackup = path.join(this.restorePointDir, 'config.json.backup');
    if (await exists(configBackup)) {
      try {
        await fsp.copyFile(configBackup, this.configFile);
        await this.sanitizeServerConfig();
      } catch (e) {
        console.warn('Failed to restore config.json:', e.message);
      }
    }

    // Restore metadata
    const metaBackup = path.join(this.restorePointDir, 'metadata.json.backup');
    if (await exists(metaBackup)) {
      try {
        await fsp.copyFile(metaBackup, this.metadataFile);
      } catch (e) {
        console.warn('Failed to restore metadata.json:', e.message);
      }
    }

    // Revert mod states according to restore point
    const currentMods = await this.getInstalledMods(false);
    let revertedCount = 0;

    for (const savedMod of restoreData.mods) {
      const match = currentMods.find(
        (m) =>
          m.fileName === savedMod.fileName ||
          m.manifest.name === savedMod.name ||
          (savedMod.remoteId && m.remoteId === savedMod.remoteId)
      );

      if (match) {
        if (match.isEnabled !== savedMod.isEnabled) {
          await this.setModEnabled(match.fileName, savedMod.isEnabled);
          revertedCount++;
        }
      }
    }

    // If there are new mods installed after the restore point that could cause a crash,
    // safely disable them so the server can boot up cleanly in the verified state
    for (const cur of currentMods) {
      const wasInRestorePoint = restoreData.mods.some(
        (m) => m.fileName.replace(/\.disabled$/, '') === cur.fileName.replace(/\.disabled$/, '')
      );
      if (!wasInRestorePoint && cur.isEnabled) {
        await this.setModEnabled(cur.fileName, false);
        revertedCount++;
      }
    }

    return {
      success: true,
      createdAt: restoreData.createdAt,
      modCount: restoreData.mods.length,
      revertedCount,
    };
  }
}

module.exports = {
  ModManager,
  selectBestCurseForgeFile,
};
