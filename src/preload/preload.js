'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // App Config
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('app:save-config', cfg),
  selectServerDir: () => ipcRenderer.invoke('dialog:select-server-dir'),
  openPath: (p) => ipcRenderer.invoke('system:open-path', p),
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  getLoginItem: () => ipcRenderer.invoke('app:get-login-item'),
  setLoginItem: (enabled, openAsHidden) => ipcRenderer.invoke('app:set-login-item', enabled, openAsHidden),
  createShortcut: () => ipcRenderer.invoke('app:create-shortcut'),

  // Launcher Self-Update
  checkForAppUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  getAppVersionInfo: () => ipcRenderer.invoke('app:get-version-info'),
  performAppUpdate: () => ipcRenderer.invoke('app:perform-update'),
  onAppUpdateProgress: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('app:update-progress', fn);
    return () => ipcRenderer.removeListener('app:update-progress', fn);
  },

  // Hytale Account
  getHytaleStatus: () => ipcRenderer.invoke('hytale:get-status'),
  startDeviceLogin: () => ipcRenderer.invoke('hytale:start-device-login'),
  pollDeviceLogin: (data) => ipcRenderer.invoke('hytale:poll-device-login', data),
  cancelLogin: () => ipcRenderer.invoke('hytale:cancel-login'),
  onLoginProgress: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('hytale:login-progress', fn);
    return () => ipcRenderer.removeListener('hytale:login-progress', fn);
  },

  // Server Updates
  checkServerVersion: (patchline) => ipcRenderer.invoke('server:check-version', patchline),
  performServerUpdate: (patchline) => ipcRenderer.invoke('server:perform-update', patchline),
  onServerUpdateProgress: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('server:update-progress', fn);
    return () => ipcRenderer.removeListener('server:update-progress', fn);
  },

  // Mod Management
  getInstalledMods: (checkUpdates) => ipcRenderer.invoke('mods:list', checkUpdates),
  setModEnabled: (fileName, enable) => ipcRenderer.invoke('mods:set-enabled', fileName, enable),
  deleteMod: (fileName, deleteConfig) => ipcRenderer.invoke('mods:delete', fileName, deleteConfig),
  updateMod: (item, options) => ipcRenderer.invoke('mods:update', item, options),
  onModActionProgress: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('mods:action-progress', fn);
    return () => ipcRenderer.removeListener('mods:action-progress', fn);
  },

  // CurseForge
  searchCurseForge: (params) => ipcRenderer.invoke('cf:search', params),
  getCfCategories: () => ipcRenderer.invoke('cf:categories'),
  getCfMod: (modId) => ipcRenderer.invoke('cf:get-mod', modId),
  getCfDescription: (modId) => ipcRenderer.invoke('cf:get-description', modId),
  installCfMod: (modObj, fileObj, installDeps, targetServerVersion) => ipcRenderer.invoke('cf:install', modObj, fileObj, installDeps, targetServerVersion),

  // Thunderstore
  searchThunderstore: (params) => ipcRenderer.invoke('ts:search', params),
  installThunderstore: (pkgInfo) => ipcRenderer.invoke('ts:install', pkgInfo),

  // Profiles
  getProfiles: () => ipcRenderer.invoke('profiles:list'),
  createProfile: (name, desc) => ipcRenderer.invoke('profiles:create', name, desc),
  activateProfile: (name) => ipcRenderer.invoke('profiles:activate', name),
  exportProfileDialog: (name) => ipcRenderer.invoke('profiles:export-dialog', name),
  importProfileDialog: () => ipcRenderer.invoke('profiles:import-dialog'),

  // Restore Points
  getRestorePoint: () => ipcRenderer.invoke('restore-point:get'),
  createRestorePoint: (reason) => ipcRenderer.invoke('restore-point:create', reason),
  applyRestorePoint: () => ipcRenderer.invoke('restore-point:apply'),
  onRestorePointUpdated: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('restore-point:updated', fn);
    return () => ipcRenderer.removeListener('restore-point:updated', fn);
  },

  // Server Console / Execution
  getServerStatus: () => ipcRenderer.invoke('server:status'),
  getServerAuthStatus: () => ipcRenderer.invoke('server:get-auth-status'),
  setAuthMode: (mode) => ipcRenderer.invoke('server:set-auth-mode', mode),
  authenticateServer: () => ipcRenderer.invoke('server:authenticate'),
  startServer: (opts) => ipcRenderer.invoke('server:start', opts),
  stopServer: () => ipcRenderer.invoke('server:stop'),
  sendCommand: (cmd) => ipcRenderer.invoke('server:send-command', cmd),
  getServerLogs: () => ipcRenderer.invoke('server:get-logs'),
  onServerLog: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('server:log', fn);
    return () => ipcRenderer.removeListener('server:log', fn);
  },
  onServerStatusChange: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('server:status-change', fn);
    return () => ipcRenderer.removeListener('server:status-change', fn);
  },
  onServerAuthDeviceCode: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('server:auth-device-code', fn);
    return () => ipcRenderer.removeListener('server:auth-device-code', fn);
  },
  onServerAuthStatusChange: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('server:auth-status-change', fn);
    return () => ipcRenderer.removeListener('server:auth-status-change', fn);
  },
  onServerAuthProfile: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('server:auth-profile', fn);
    return () => ipcRenderer.removeListener('server:auth-profile', fn);
  },
  onServerAuthWarning: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('server:auth-warning', fn);
    return () => ipcRenderer.removeListener('server:auth-warning', fn);
  },

  // Fresh Server Installation Wizard
  detectClientInstall: () => ipcRenderer.invoke('installer:detect-client'),
  checkJava: () => ipcRenderer.invoke('installer:check-java'),
  selectZipFileDialog: () => ipcRenderer.invoke('dialog:select-zip-file'),
  initializeServer: (targetDir, options) => ipcRenderer.invoke('installer:initialize-server', targetDir, options),
  cancelServerInstall: () => ipcRenderer.invoke('installer:cancel'),
  onInstallerProgress: (cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on('installer:progress', fn);
    return () => ipcRenderer.removeListener('installer:progress', fn);
  },
});
