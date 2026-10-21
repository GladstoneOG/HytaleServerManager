'use strict';
/**
 * Electron IPC Handler Registration
 * Connects frontend UI actions with backend services.
 */
const { app, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fsp = require('fs/promises');
const { readJson, writeJsonAtomic, ensureDir } = require('./util');

function registerIpcHandlers({
  win,
  appConfigPath,
  authManager,
  serverUpdater,
  serverInstaller,
  modManager,
  serverRunner,
  trayManager,
  cfClient,
  tsClient,
}) {
  // Config helper
  async function getAppConfig() {
    return await readJson(appConfigPath, {
      serverDir: 'F:\\serverht\\Server',
      patchline: 'release',
      cfApiKey: '',
      theme: 'dark',
      activeTab: 'dashboard',
      launchMode: 'integrated',
      closeToTray: true,
      maxRam: '6G',
      minRam: '4G',
    });
  }

  async function saveAppConfig(cfg) {
    await writeJsonAtomic(appConfigPath, cfg);
    if (cfg.serverDir) {
      authManager.setServerDir(cfg.serverDir);
      serverUpdater.setServerDir(cfg.serverDir);
      modManager.setServerDir(cfg.serverDir);
      serverRunner.setServerDir(cfg.serverDir);
    }
    if (trayManager && typeof cfg.closeToTray === 'boolean') {
      trayManager.closeToTrayEnabled = cfg.closeToTray;
    }
  }

  // --- App Settings ---
  ipcMain.handle('app:get-config', async () => {
    return await getAppConfig();
  });

  ipcMain.handle('app:save-config', async (_, cfg) => {
    await saveAppConfig(cfg);
    return { success: true };
  });

  ipcMain.handle('app:create-shortcut', async () => {
    try {
      const { createShortcut } = require(path.join(__dirname, '..', '..', 'scripts', 'create-shortcut'));
      return createShortcut();
    } catch (e) {
      return { success: false, error: e.message, created: [] };
    }
  });

  ipcMain.handle('dialog:select-server-dir', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Select Hytale Server Folder',
      properties: ['openDirectory'],
      defaultPath: 'F:\\serverht\\Server',
    });
    if (!res.canceled && res.filePaths.length > 0) {
      const selected = res.filePaths[0];
      const cfg = await getAppConfig();
      cfg.serverDir = selected;
      await saveAppConfig(cfg);
      return selected;
    }
    return null;
  });

  ipcMain.handle('system:open-path', async (_, p) => {
    if (p) await shell.openPath(p);
  });

  ipcMain.handle('system:open-external', async (_, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) await shell.openExternal(url);
  });

  // --- Launch at login (with configurable start-hidden flag) ---
  function loginItemOptions(openAsHidden = true) {
    const args = openAsHidden ? ['--hidden'] : [];
    return app.isPackaged
      ? { path: process.execPath, args }
      : { path: process.execPath, args: [app.getAppPath(), ...args] };
  }

  ipcMain.handle('app:get-login-item', () => {
    try {
      const s = app.getLoginItemSettings(loginItemOptions(true));
      return { openAtLogin: Boolean(s.openAtLogin) };
    } catch {
      return { openAtLogin: false };
    }
  });

  ipcMain.handle('app:set-login-item', (_, enabled, openAsHidden = true) => {
    try {
      app.setLoginItemSettings({ openAtLogin: !!enabled, ...loginItemOptions(openAsHidden) });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- Hytale Auth ---
  ipcMain.handle('hytale:get-status', async () => {
    return await authManager.getStatus();
  });

  let activeLoginAbort = null;
  ipcMain.handle('hytale:start-device-login', async () => {
    const deviceAuth = await authManager.startDeviceLogin();
    // Automatically open verification URL in user's browser
    if (deviceAuth.verification_uri_complete) {
      shell.openExternal(deviceAuth.verification_uri_complete).catch(() => {});
    }
    return deviceAuth;
  });

  ipcMain.handle('hytale:poll-device-login', async (_, deviceAuth) => {
    if (activeLoginAbort) activeLoginAbort.abort();
    activeLoginAbort = new AbortController();

    try {
      const creds = await authManager.pollDeviceLogin(deviceAuth, {
        signal: activeLoginAbort.signal,
        onPoll: (info) => {
          win.webContents.send('hytale:login-progress', info);
        },
      });
      return { success: true, creds };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      activeLoginAbort = null;
    }
  });

  ipcMain.handle('hytale:cancel-login', () => {
    if (activeLoginAbort) {
      activeLoginAbort.abort();
      activeLoginAbort = null;
    }
    return { success: true };
  });

  // --- Server Updater ---
  ipcMain.handle('server:check-version', async (_, patchline = 'release') => {
    try {
      return await serverUpdater.checkForUpdates(patchline);
    } catch (e) {
      return {
        error: e.message,
        installed: false,
        updateAvailable: false,
      };
    }
  });

  let activeUpdateAbort = null;
  ipcMain.handle('server:perform-update', async (_, patchline = 'release') => {
    if (activeUpdateAbort) activeUpdateAbort.abort();
    activeUpdateAbort = new AbortController();

    try {
      const res = await serverUpdater.updateServer({
        patchline,
        signal: activeUpdateAbort.signal,
        onProgress: (p) => {
          win.webContents.send('server:update-progress', p);
        },
      });
      return { success: true, ...res };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      activeUpdateAbort = null;
    }
  });

  // --- Mod Management ---
  ipcMain.handle('mods:list', async (_, checkRemoteUpdates = true) => {
    return await modManager.getInstalledMods(checkRemoteUpdates);
  });

  ipcMain.handle('mods:set-enabled', async (_, fileName, enable) => {
    return await modManager.setModEnabled(fileName, enable);
  });

  ipcMain.handle('mods:delete', async (_, fileName, deleteConfigDir = false) => {
    return await modManager.deleteMod(fileName, deleteConfigDir);
  });

  ipcMain.handle('mods:update', async (_, item, options = {}) => {
    try {
      const res = await modManager.updateMod(item, {
        targetServerVersion: options.targetServerVersion,
        onProgress: (p) => win.webContents.send('mods:action-progress', p),
      });
      return { success: true, ...res };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- CurseForge ---
  ipcMain.handle('cf:search', async (_, params) => {
    return await cfClient.searchMods(params);
  });

  ipcMain.handle('cf:categories', async () => {
    return await cfClient.getCategories();
  });

  ipcMain.handle('cf:get-mod', async (_, modId) => {
    return await cfClient.getMod(modId);
  });

  ipcMain.handle('cf:get-description', async (_, modId) => {
    return await cfClient.getModDescription(modId);
  });

  ipcMain.handle('cf:install', async (_, modObj, fileObj, installDeps = true, targetServerVersion = null) => {
    try {
      const res = await modManager.installCurseForgeMod(modObj, fileObj, {
        installDeps,
        targetServerVersion,
        onProgress: (p) => win.webContents.send('mods:action-progress', p),
      });
      return { success: true, ...res };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- Thunderstore ---
  ipcMain.handle('ts:search', async (_, params) => {
    return await tsClient.searchPackages(params);
  });

  ipcMain.handle('ts:install', async (_, pkgInfo) => {
    try {
      const res = await modManager.installThunderstoreMod(pkgInfo, {
        onProgress: (p) => win.webContents.send('mods:action-progress', p),
      });
      return { success: true, ...res };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- Profiles ---
  ipcMain.handle('profiles:list', async () => {
    return await modManager.getProfiles();
  });

  ipcMain.handle('profiles:create', async (_, name, desc) => {
    return await modManager.createProfile(name, desc);
  });

  ipcMain.handle('profiles:activate', async (_, name) => {
    return await modManager.activateProfile(name);
  });

  ipcMain.handle('profiles:export-dialog', async (_, name) => {
    const res = await dialog.showSaveDialog(win, {
      title: `Export Profile: ${name}`,
      defaultPath: `${name}.hytale-profile.json`,
      filters: [{ name: 'JSON Profile', extensions: ['json'] }],
    });
    if (!res.canceled && res.filePath) {
      await modManager.exportProfile(name, res.filePath);
      return { success: true, path: res.filePath };
    }
    return { canceled: true };
  });

  ipcMain.handle('profiles:import-dialog', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Import Profile File',
      properties: ['openFile'],
      filters: [{ name: 'JSON Profile', extensions: ['json'] }],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      const filePath = res.filePaths[0];
      const result = await modManager.importProfile(filePath, {
        autoDownload: true,
        onProgress: (p) => win.webContents.send('mods:action-progress', p),
      });
      return { success: true, ...result };
    }
    return { canceled: true };
  });

  // --- Restore Points ---
  ipcMain.handle('restore-point:get', async () => {
    return await modManager.getRestorePointInfo();
  });

  ipcMain.handle('restore-point:create', async (_, reason) => {
    return await modManager.createRestorePoint(reason || 'Manual snapshot');
  });

  ipcMain.handle('restore-point:apply', async () => {
    try {
      return await modManager.restoreLastKnownGoodState();
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // --- Server Runner / Console ---
  ipcMain.handle('server:status', async () => {
    await serverRunner.findRunningServerProcess();
    return serverRunner.getStatus();
  });

  ipcMain.handle('server:start', async (_, opts = {}) => {
    try {
      const cfg = await getAppConfig();
      const mode = opts.mode || cfg.launchMode || 'integrated';
      const maxRam = opts.maxRam || cfg.maxRam || '6G';
      const minRam = opts.minRam || cfg.minRam || '4G';
      const jvmOptions = opts.jvmOptions || [
        `-Xms${minRam}`,
        `-Xmx${maxRam}`,
        '-XX:+UseG1GC',
      ];
      return await serverRunner.startServer({
        mode,
        jvmOptions,
        extraArgs: opts.extraArgs || [],
      });
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('server:stop', async () => {
    return await serverRunner.stopServer();
  });

  ipcMain.handle('server:send-command', (_, cmd) => {
    try {
      serverRunner.sendCommand(cmd);
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('server:get-logs', () => {
    return serverRunner.getLogs();
  });

  // --- Fresh Server Installation Wizard ---
  ipcMain.handle('installer:detect-client', async () => {
    return await serverInstaller.detectLocalClientInstall();
  });

  ipcMain.handle('installer:check-java', async () => {
    return await serverInstaller.checkJava();
  });

  ipcMain.handle('dialog:select-zip-file', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Select Hytale Server Archive (.zip)',
      properties: ['openFile'],
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  let activeInstallerAbort = null;
  ipcMain.handle('installer:initialize-server', async (_, targetDir, options = {}) => {
    if (activeInstallerAbort) activeInstallerAbort.abort();
    activeInstallerAbort = new AbortController();

    try {
      const result = await serverInstaller.initializeServer(targetDir, {
        ...options,
        signal: activeInstallerAbort.signal,
        onProgress: (p) => {
          if (!win.isDestroyed()) {
            win.webContents.send('installer:progress', p);
          }
        },
      });

      // Update active serverDir in app config automatically!
      const cfg = await getAppConfig();
      cfg.serverDir = targetDir;
      await saveAppConfig(cfg);

      return { success: true, ...result };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      activeInstallerAbort = null;
    }
  });

  ipcMain.handle('installer:cancel', () => {
    if (activeInstallerAbort) {
      activeInstallerAbort.abort();
      activeInstallerAbort = null;
    }
    return { success: true };
  });

  // Forward server runner events to UI
  serverRunner.on('log', (entry) => {
    if (!win.isDestroyed()) {
      win.webContents.send('server:log', entry);
    }
  });

  serverRunner.on('status-change', (status) => {
    if (!win.isDestroyed()) {
      win.webContents.send('server:status-change', status);
    }
  });
}

module.exports = {
  registerIpcHandlers,
};
