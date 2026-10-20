'use strict';
/**
 * Main Electron Application Entry Point
 *
 * Launch behaviour:
 * - Single instance: launching again focuses the existing window instead of opening a second copy.
 * - No white flash: the window is created hidden and shown on 'ready-to-show'.
 * - `--hidden` flag (used by "Launch at login"): starts straight into the system tray.
 * - Custom title bar that keeps native Windows caption buttons (titleBarOverlay).
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { HytaleAuthManager } = require('./hytaleAuth');
const { ServerUpdater } = require('./serverUpdater');
const { ServerInstaller } = require('./serverInstaller');
const { ModManager } = require('./modManager');
const { ServerRunner } = require('./serverRunner');
const { TrayManager } = require('./tray');
const { CurseForgeClient } = require('./curseforge');
const { ThunderstoreClient } = require('./thunderstore');
const { registerIpcHandlers } = require('./ipc');
const { ensureDir, readJson } = require('./util');

// Theme constants shared with the renderer's CSS tokens
const WINDOW_BG = '#0b0d12';
const TITLEBAR_HEIGHT = 48;

let mainWindow = null;
let trayManager = null;
let isAppQuitting = false;

const startHidden = process.argv.includes('--hidden');

// --- Single instance lock -------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (trayManager) trayManager.showWindow();
  });
  app.whenReady().then(createWindow);
}

async function createWindow() {
  const userDataDir = app.getPath('userData');
  await ensureDir(userDataDir);
  const appConfigPath = path.join(userDataDir, 'config.json');

  // Load persistent application config or use sensible defaults
  const appConfig = await readJson(appConfigPath, {
    serverDir: 'F:\\serverht\\Server',
    patchline: 'release',
    closeToTray: true,
    launchMode: 'integrated',
    maxRam: '6G',
    minRam: '4G',
  });
  const defaultServerDir = appConfig.serverDir || 'F:\\serverht\\Server';

  // Instantiate core clients and managers
  const authManager = new HytaleAuthManager({ serverDir: defaultServerDir });
  const serverUpdater = new ServerUpdater(authManager, { serverDir: defaultServerDir });
  const serverInstaller = new ServerInstaller({ authManager, serverUpdater });
  const cfClient = new CurseForgeClient();
  const tsClient = new ThunderstoreClient();
  const modManager = new ModManager({
    serverDir: defaultServerDir,
    curseforgeClient: cfClient,
    thunderstoreClient: tsClient,
  });
  const serverRunner = new ServerRunner({ serverDir: defaultServerDir });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 660,
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    title: 'Hytale Server Manager',
    backgroundColor: WINDOW_BG,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: WINDOW_BG,
      symbolColor: '#9aa3b2',
      height: TITLEBAR_HEIGHT,
    },
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });

  // Reads launch options from the saved config so tray "Start" matches the UI
  const getStartOptions = async () => {
    const cfg = await readJson(appConfigPath, {});
    const maxRam = cfg.maxRam || '6G';
    const minRam = cfg.minRam || '4G';
    return {
      mode: cfg.launchMode || 'integrated',
      jvmOptions: [`-Xms${minRam}`, `-Xmx${maxRam}`, '-XX:+UseG1GC'],
    };
  };

  // Setup System Tray
  trayManager = new TrayManager({ win: mainWindow, serverRunner, getStartOptions });
  trayManager.closeToTrayEnabled = appConfig.closeToTray !== false;
  trayManager.init();

  registerIpcHandlers({
    win: mainWindow,
    appConfigPath,
    authManager,
    serverUpdater,
    serverInstaller,
    modManager,
    serverRunner,
    trayManager,
    cfClient,
    tsClient,
  });

  // Check if an external or previously detached HytaleServer.jar is already running
  serverRunner.findRunningServerProcess().catch(() => {});

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Show only after first paint to avoid a blank/white flash
  mainWindow.once('ready-to-show', () => {
    if (!startHidden) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Never navigate the app window away; open external links in the browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    }
  });

  // Close-to-Tray behavior
  mainWindow.on('close', (event) => {
    if (!isAppQuitting && !trayManager?.isQuitting) {
      if (trayManager?.closeToTrayEnabled !== false) {
        event.preventDefault();
        trayManager.hideToTray();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('before-quit', () => {
  isAppQuitting = true;
  if (trayManager) trayManager.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (isAppQuitting || process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
