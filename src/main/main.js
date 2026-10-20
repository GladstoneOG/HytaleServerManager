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
const { CurseForgeClient } = require('./curseforge');
const { ThunderstoreClient } = require('./thunderstore');
const { registerIpcHandlers } = require('./ipc');
const { ensureDir } = require('./util');

let mainWindow = null;

async function createWindow() {
  const userDataDir = app.getPath('userData');
  await ensureDir(userDataDir);
  const appConfigPath = path.join(userDataDir, 'config.json');

  // Default server directory
  const defaultServerDir = 'F:\\serverht\\Server';

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
    title: 'Hytale Server Mod Manager & Updater',
    backgroundColor: '#0f141c',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  registerIpcHandlers({
    win: mainWindow,
    appConfigPath,
    authManager,
    serverUpdater,
    serverInstaller,
    modManager,
    serverRunner,
    cfClient,
    tsClient,
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
