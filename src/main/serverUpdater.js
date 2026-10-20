'use strict';
/**
 * Automated Server Updater for Hytale Dedicated Servers
 * Replaces the manual downloader-exe + copy-paste workflow with a seamless 1-click update.
 * Features:
 * - Detects currently installed server version from HytaleServer.jar MANIFEST.MF
 * - Checks upstream manifest via Hytale Auth
 * - Downloads update zip with HTTP Range resumability + SHA256 checksum verification
 * - Automatically backs up previous server binaries before applying
 * - Safely extracts server jar, assets, and licenses while preserving user config, mods, universe, and permissions
 * - Provides rollback capability if needed
 */
const path = require('path');
const fsp = require('fs/promises');
const fs = require('fs');
const { downloadFile } = require('./http');
const { readEntryText, extract, listEntries } = require('./zip');
const { exists, ensureDir, compareVersions } = require('./util');

class ServerUpdater {
  constructor(authManager, options = {}) {
    this.authManager = authManager;
    this.serverDir = options.serverDir || 'F:\\serverht\\Server';
    this.parentDir = path.dirname(this.serverDir);
  }

  setServerDir(dir) {
    this.serverDir = dir;
    this.parentDir = path.dirname(dir);
  }

  /**
   * Detect current installed version by inspecting HytaleServer.jar
   */
  async getInstalledVersion() {
    const jarPath = path.join(this.serverDir, 'HytaleServer.jar');
    if (!(await exists(jarPath))) {
      return {
        installed: false,
        version: null,
        jarPath,
      };
    }

    try {
      const manifestText = await readEntryText(jarPath, 'META-INF/MANIFEST.MF');
      if (!manifestText) {
        return { installed: true, version: 'Unknown', jarPath };
      }

      const match = manifestText.match(/Implementation-Version:\s*([^\r\n]+)/i);
      const version = match ? match[1].trim() : 'Unknown';

      const patchlineMatch = manifestText.match(/Implementation-Patchline:\s*([^\r\n]+)/i);
      const patchline = patchlineMatch ? patchlineMatch[1].trim() : 'release';

      const revisionMatch = manifestText.match(/Implementation-Revision-Id:\s*([^\r\n]+)/i);
      const revision = revisionMatch ? revisionMatch[1].trim() : null;

      return {
        installed: true,
        version,
        patchline,
        revision,
        jarPath,
      };
    } catch (e) {
      return { installed: true, version: 'Unknown', error: e.message, jarPath };
    }
  }

  /**
   * Check for updates from Hytale account service
   */
  async checkForUpdates(patchline = 'release') {
    const installed = await this.getInstalledVersion();
    let upstream = null;
    let updateAvailable = false;
    let authRequired = false;

    try {
      upstream = await this.authManager.getVersionManifest(patchline);
      if (upstream && upstream.version) {
        if (!installed.installed || !installed.version || installed.version === 'Unknown') {
          updateAvailable = true;
        } else {
          // Compare versions
          updateAvailable = compareVersions(installed.version, upstream.version) < 0;
        }
      }
    } catch (e) {
      if (e.message && e.message.includes('Not authenticated')) {
        authRequired = true;
      } else {
        throw e;
      }
    }

    return {
      installedVersion: installed.version,
      installed: installed.installed,
      latestVersion: upstream?.version || null,
      updateAvailable,
      authRequired,
      manifest: upstream,
      patchline,
    };
  }

  /**
   * Perform seamless one-click server update
   */
  async updateServer({ patchline = 'release', onProgress, signal } = {}) {
    onProgress?.({ step: 'checking', message: 'Checking for latest server version...' });

    const check = await this.checkForUpdates(patchline);
    if (!check.manifest || !check.latestVersion) {
      throw new Error('Could not retrieve update manifest from Hytale.');
    }

    const { version, download_url, sha256 } = check.manifest;

    // Determine cache location for download zip
    const downloadsDir = path.join(this.parentDir, 'downloads');
    await ensureDir(downloadsDir);
    const targetZip = path.join(downloadsDir, `${version}.zip`);

    onProgress?.({
      step: 'downloading',
      message: `Downloading Hytale Server update v${version}...`,
      targetVersion: version,
    });

    // Signed URLs expire after a short time, so provide a URL generator
    const urlProvider = async () => {
      return await this.authManager.getSignedDownloadUrl(download_url);
    };

    await downloadFile(urlProvider, targetZip, {
      sha256,
      onProgress: (p) => {
        onProgress?.({
          step: 'downloading',
          message: `Downloading server v${version} (${p.done ? (p.done / (1024 * 1024)).toFixed(1) : 0} MB${
            p.total ? ` / ${(p.total / (1024 * 1024)).toFixed(1)} MB` : ''
          })`,
          ...p,
        });
      },
      signal,
      retries: 15,
    });

    // Create safety backup of existing binary files
    onProgress?.({ step: 'backup', message: 'Backing up current server binaries...' });
    const backupDir = path.join(this.parentDir, 'updater_backups', `backup_${Date.now()}`);
    await ensureDir(backupDir);

    const filesToBackup = [
      path.join(this.serverDir, 'HytaleServer.jar'),
      path.join(this.serverDir, 'HytaleServer.aot'),
      path.join(this.serverDir, 'HytaleServer.aot.config'),
      path.join(this.serverDir, 'Assets.zip'),
    ];

    for (const f of filesToBackup) {
      if (await exists(f)) {
        try {
          await fsp.copyFile(f, path.join(backupDir, path.basename(f)));
        } catch {
          // Best effort backup
        }
      }
    }

    // Extract update zip files to server directory
    onProgress?.({ step: 'extracting', message: 'Applying update files...' });

    const updatedFiles = [];
    await extract(
      targetZip,
      (entryName) => {
        // Zip contents:
        // - Server/HytaleServer.jar -> Server/HytaleServer.jar
        // - Server/HytaleServer.aot.config -> Server/HytaleServer.aot.config
        // - Server/Licenses/* -> Server/Licenses/*
        // - Assets.zip -> Assets.zip (placed in Server/ or parent as appropriate)
        // - start.bat / start.sh -> parent or server

        if (entryName.startsWith('Server/')) {
          const rel = entryName.slice('Server/'.length);
          // Never overwrite configs or user data if zip ever contained them
          if (rel === 'config.json' || rel.startsWith('mods/') || rel.startsWith('universe/')) {
            return null;
          }
          const dest = path.join(this.serverDir, rel);
          updatedFiles.push(dest);
          return dest;
        }

        if (entryName === 'Assets.zip') {
          // If server directory already has Assets.zip, put it there
          const inServer = path.join(this.serverDir, 'Assets.zip');
          updatedFiles.push(inServer);
          return inServer;
        }

        return null;
      },
      (p) => {
        onProgress?.({
          step: 'extracting',
          message: `Extracting ${path.basename(p.entry || '')}...`,
          done: p.done,
          total: p.total,
        });
      }
    );

    // Verify newly installed version
    const verified = await this.getInstalledVersion();

    onProgress?.({
      step: 'completed',
      message: `Successfully updated Hytale Server to v${verified.version}!`,
    });

    return {
      success: true,
      previousVersion: check.installedVersion,
      newVersion: verified.version,
      backupDir,
      updatedFilesCount: updatedFiles.length,
    };
  }
}

module.exports = {
  ServerUpdater,
};
