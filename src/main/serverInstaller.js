'use strict';
/**
 * Fresh Server Installation & Provisioning Engine
 * Implements the official setup procedure documented in the Hytale Server Manual:
 * - Detects local game client files (fast local copy without re-downloading)
 * - Downloads fresh server builds via Hytale OAuth2 account API
 * - Unpacks existing zip archives
 * - Generates complete server directory structure (.cache, logs, mods, universe)
 * - Generates standard config.json and launch scripts (start.bat / start.sh)
 * - Checks Java runtime availability (Java 25 recommended)
 */
const path = require('path');
const fsp = require('fs/promises');
const fs = require('fs');
const { exec } = require('child_process');
const { extract, listEntries } = require('./zip');
const { downloadFile } = require('./http');
const { exists, ensureDir, writeJsonAtomic, isInside } = require('./util');

class ServerInstaller {
  constructor({ authManager, serverUpdater } = {}) {
    this.authManager = authManager;
    this.serverUpdater = serverUpdater;
  }

  /**
   * Check if Java is installed on the host and detect version
   */
  async checkJava() {
    return new Promise((resolve) => {
      exec('java -version', (err, stdout, stderr) => {
        if (err) {
          return resolve({
            installed: false,
            version: null,
            majorVersion: null,
            isJava25Recommended: false,
            message: 'Java is not found in system PATH. Hytale Server requires Java 25 (or Java 21+).',
          });
        }

        const output = (stderr || stdout || '').toString();
        // Parse version e.g. "openjdk version 25.0.1" or "java version 21.0.2"
        const match = output.match(/version\s+"?(\d+)(\.[\d\._]+)?"?/i);
        const major = match ? parseInt(match[1], 10) : null;
        const versionStr = match ? match[0].replace(/version\s+"?/i, '').replace(/"/, '') : 'Unknown';

        resolve({
          installed: true,
          version: versionStr,
          majorVersion: major,
          isJava25Recommended: major >= 25,
          output: output.split(/\r?\n/)[0],
        });
      });
    });
  }

  /**
   * Detect if Hytale game client is installed locally on this machine
   */
  async detectLocalClientInstall() {
    const appData = process.env.APPDATA || '';
    const localAppData = process.env.LOCALAPPDATA || '';

    const candidatePaths = [
      path.join(appData, 'Hytale', 'install', 'release', 'package', 'game', 'latest'),
      path.join(appData, 'Hytale', 'install', 'pre-release', 'package', 'game', 'latest'),
      path.join(localAppData, 'Hytale', 'install', 'release', 'package', 'game', 'latest'),
      'C:\\Program Files\\Hytale\\install\\release\\package\\game\\latest',
    ];

    for (const p of candidatePaths) {
      const jarPath = path.join(p, 'Server', 'HytaleServer.jar');
      const assetsPath = path.join(p, 'Assets.zip');

      if ((await exists(jarPath)) && (await exists(assetsPath))) {
        let assetsSize = 0;
        try { assetsSize = (await fsp.stat(assetsPath)).size; } catch {}

        return {
          detected: true,
          sourcePath: p,
          serverDir: path.join(p, 'Server'),
          jarPath,
          assetsPath,
          assetsSize,
        };
      }
    }

    return { detected: false, sourcePath: null };
  }

  /**
   * Initialize and install a fresh Hytale Dedicated Server
   */
  async initializeServer(targetServerDir, {
    source = 'local_client', // 'local_client' | 'download' | 'zip_file'
    zipPath = null,
    serverName = 'Hytale Dedicated Server',
    motd = 'Welcome to our Hytale Server!',
    maxPlayers = 20,
    port = 5520,
    gameMode = 'Adventure',
    memoryMin = '4G',
    memoryMax = '6G',
    patchline = 'release',
    onProgress,
    signal,
  } = {}) {
    onProgress?.({ step: 'preparing', message: 'Preparing server directory structure...' });

    // 1. Create directory structure required by the manual
    await ensureDir(targetServerDir);
    const modsDir = path.join(targetServerDir, 'mods');
    const universeDir = path.join(targetServerDir, 'universe');
    const logsDir = path.join(targetServerDir, 'logs');
    const cacheDir = path.join(targetServerDir, '.cache');
    const licensesDir = path.join(targetServerDir, 'Licenses');

    await ensureDir(modsDir);
    await ensureDir(universeDir);
    await ensureDir(logsDir);
    await ensureDir(cacheDir);
    await ensureDir(licensesDir);

    const destJar = path.join(targetServerDir, 'HytaleServer.jar');
    const destAotConfig = path.join(targetServerDir, 'HytaleServer.aot.config');
    const destAssets = path.join(targetServerDir, 'Assets.zip');

    // 2. Acquire binaries based on selected source
    if (source === 'local_client') {
      const local = await this.detectLocalClientInstall();
      if (!local.detected) {
        throw new Error('Local Hytale game client installation was not found.');
      }

      onProgress?.({ step: 'copying', message: 'Copying HytaleServer.jar from local client...' });
      await fsp.copyFile(local.jarPath, destJar);

      const srcAotConfig = path.join(local.serverDir, 'HytaleServer.aot.config');
      if (await exists(srcAotConfig)) {
        await fsp.copyFile(srcAotConfig, destAotConfig);
      }

      // Copy Licenses
      const srcLicenses = path.join(local.serverDir, 'Licenses');
      if (await exists(srcLicenses)) {
        onProgress?.({ step: 'copying', message: 'Copying license files...' });
        const licFiles = await fsp.readdir(srcLicenses);
        for (const lf of licFiles) {
          await fsp.copyFile(path.join(srcLicenses, lf), path.join(licensesDir, lf));
        }
      }

      // Copy Assets.zip
      onProgress?.({ step: 'copying', message: 'Copying Assets.zip (game data)...' });
      await copyFileWithProgress(local.assetsPath, destAssets, (p) => {
        onProgress?.({
          step: 'copying',
          message: `Copying Assets.zip: ${(p.done / (1024 * 1024)).toFixed(0)} MB / ${(p.total / (1024 * 1024)).toFixed(0)} MB`,
          ...p,
        });
      });

    } else if (source === 'download') {
      if (!this.authManager) {
        throw new Error('Authentication manager is required for online server download.');
      }

      onProgress?.({ step: 'manifest', message: 'Fetching latest version manifest from Hytale...' });
      const manifest = await this.authManager.getVersionManifest(patchline);
      if (!manifest || !manifest.download_url) {
        throw new Error('Could not retrieve version manifest from Hytale account service.');
      }

      const tempZip = path.join(path.dirname(targetServerDir), `hytale_server_${manifest.version || 'latest'}.zip`);
      onProgress?.({
        step: 'downloading',
        message: `Downloading Hytale Server v${manifest.version || 'latest'} package...`,
      });

      const urlProvider = async () => {
        return await this.authManager.getSignedDownloadUrl(manifest.download_url);
      };

      await downloadFile(urlProvider, tempZip, {
        sha256: manifest.sha256,
        onProgress: (p) => {
          onProgress?.({
            step: 'downloading',
            message: `Downloading server: ${p.done ? (p.done / (1024 * 1024)).toFixed(1) : 0} MB${
              p.total ? ` / ${(p.total / (1024 * 1024)).toFixed(1)} MB` : ''
            }`,
            ...p,
          });
        },
        signal,
        retries: 15,
      });

      onProgress?.({ step: 'extracting', message: 'Extracting server files and assets...' });
      await extractFromZipArchive(tempZip, targetServerDir, onProgress);

    } else if (source === 'zip_file') {
      if (!zipPath || !(await exists(zipPath))) {
        throw new Error(`Specified zip file does not exist: ${zipPath}`);
      }

      onProgress?.({ step: 'extracting', message: 'Extracting server files from archive...' });
      await extractFromZipArchive(zipPath, targetServerDir, onProgress);
    }

    // 3. Generate standard config.json
    onProgress?.({ step: 'configuring', message: 'Generating server configuration (config.json)...' });
    const configPath = path.join(targetServerDir, 'config.json');
    if (!(await exists(configPath))) {
      const initialConfig = {
        Version: 4,
        ServerName: serverName,
        MOTD: motd,
        Password: '',
        MaxPlayers: Number(maxPlayers) || 20,
        MaxViewRadius: 32,
        Port: Number(port) || 5520,
        Defaults: {
          World: 'default',
          GameMode: gameMode,
          HardcoreMode: 'None',
          CrashRecovery: {},
        },
        ConnectionTimeouts: {},
        RateLimit: {},
        Modules: {},
        LogLevels: {},
        Mods: {},
        DefaultModsEnabled: true,
        RequireJoinPermission: false,
        DisplayTmpTagsInStrings: false,
        PlayerStorage: { Type: 'Hytale' },
        UniverseResourceStorage: { Type: 'Hytale' },
        BanStorage: { Type: 'Disk', Path: 'bans.json' },
        AuthCredentialStore: { Type: 'Encrypted', Path: 'auth.enc' },
        Update: {},
        Backup: {},
        WorldMap: {},
      };
      await writeJsonAtomic(configPath, initialConfig);
    }

    // 4. Generate startup scripts
    onProgress?.({ step: 'configuring', message: 'Creating startup scripts (start.bat / start.sh)...' });
    const startBatPath = path.join(targetServerDir, 'start.bat');
    const startBatContent = `@echo off
title ${serverName}
echo Starting ${serverName}...
echo [QUIC UDP Port: ${port}]
echo.
java -Xms${memoryMin} -Xmx${memoryMax} -XX:+UseG1GC -jar HytaleServer.jar --assets Assets.zip
pause
`;
    await fsp.writeFile(startBatPath, startBatContent, 'utf8');

    const startShPath = path.join(targetServerDir, 'start.sh');
    const startShContent = `#!/bin/bash
echo "Starting ${serverName}..."
java -Xms${memoryMin} -Xmx${memoryMax} -XX:+UseG1GC -jar HytaleServer.jar --assets Assets.zip
`;
    await fsp.writeFile(startShPath, startShContent, 'utf8');

    onProgress?.({
      step: 'completed',
      message: 'Hytale Dedicated Server successfully initialized and ready!',
    });

    return {
      success: true,
      serverDir: targetServerDir,
      jarExists: await exists(destJar),
      assetsExists: await exists(destAssets),
    };
  }
}

/**
 * Helper to copy large files with progress reporting
 */
async function copyFileWithProgress(src, dest, onProgress) {
  const stat = await fsp.stat(src);
  const total = stat.size;
  let done = 0;
  let lastTick = 0;

  await ensureDir(path.dirname(dest));
  const readStream = fs.createReadStream(src, { highWaterMark: 8 * 1024 * 1024 });
  const writeStream = fs.createWriteStream(dest);

  await new Promise((resolve, reject) => {
    readStream.on('data', (chunk) => {
      done += chunk.length;
      const now = Date.now();
      if (now - lastTick > 300) {
        lastTick = now;
        onProgress?.({ done, total });
      }
    });
    readStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);
    readStream.pipe(writeStream);
  });

  onProgress?.({ done: total, total });
}

/**
 * Helper to extract server files from zip package
 */
async function extractFromZipArchive(zipPath, targetServerDir, onProgress) {
  await extract(
    zipPath,
    (entryName) => {
      if (entryName.startsWith('Server/')) {
        const rel = entryName.slice('Server/'.length);
        if (!rel) return null;
        return path.join(targetServerDir, rel);
      }
      if (entryName === 'Assets.zip') {
        return path.join(targetServerDir, 'Assets.zip');
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
}

module.exports = {
  ServerInstaller,
};
