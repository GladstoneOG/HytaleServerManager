'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // App Config
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('app:save-config', cfg),
  selectServerDir: () => ipcRenderer.invoke('dialog:select-server-dir'),
  openPath: (p) => ipcRenderer.invoke('system:open-path', p),
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url),

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
  updateMod: (item) => ipcRenderer.invoke('mods:update', item),
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
  installCfMod: (modObj, fileObj, installDeps) => ipcRenderer.invoke('cf:install', modObj, fileObj, installDeps),

  // Thunderstore
  searchThunderstore: (params) => ipcRenderer.invoke('ts:search', params),
  installThunderstore: (pkgInfo) => ipcRenderer.invoke('ts:install', pkgInfo),

  // Profiles
  getProfiles: () => ipcRenderer.invoke('profiles:list'),
  createProfile: (name, desc) => ipcRenderer.invoke('profiles:create', name, desc),
  activateProfile: (name) => ipcRenderer.invoke('profiles:activate', name),
  exportProfileDialog: (name) => ipcRenderer.invoke('profiles:export-dialog', name),
  importProfileDialog: () => ipcRenderer.invoke('profiles:import-dialog'),

  // Server Console / Execution
  getServerStatus: () => ipcRenderer.invoke('server:status'),
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
