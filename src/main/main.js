'use strict';
/**
 * Main Electron Application Entry Point
 */
const { app, BrowserWindow } = require('electron');
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

let mainWindow = null;
let trayManager = null;
let isAppQuitting = false;

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
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    title: 'Hytale Server Mod Manager & Updater',
    backgroundColor: '#0f141c',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Setup System Tray
  trayManager = new TrayManager({ win: mainWindow, serverRunner });
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

app.whenReady().then(createWindow);

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
