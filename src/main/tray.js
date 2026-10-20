'use strict';
/**
 * System Tray & Ultra-Low Resource Background Mode
 * - Minimizes to system tray on window minimize or close
 * - When in tray, window rendering is hidden and background timers throttle down to ~0.0% CPU
 * - Allows managing server status from the tray icon
 * - Supports quitting the manager while leaving the server running in the background!
 */
const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

class TrayManager {
  constructor({ win, serverRunner } = {}) {
    this.win = win;
    this.serverRunner = serverRunner;
    this.tray = null;
    this.isQuitting = false;
    this.closeToTrayEnabled = true;
  }

  init() {
    const fs = require('fs');
    const assetsDir = path.join(__dirname, '..', 'assets');
    const icoPath = path.join(assetsDir, 'tray-icon.ico');
    const pngPath = path.join(assetsDir, 'tray-icon.png');

    let iconPath = pngPath;
    if (process.platform === 'win32' && fs.existsSync(icoPath)) {
      iconPath = icoPath;
    }

    let icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty() && fs.existsSync(pngPath)) {
      icon = nativeImage.createFromPath(pngPath);
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('Hytale Server Mod Manager');

    this.updateContextMenu();

    this.tray.on('double-click', () => {
      this.showWindow();
    });

    // Update tray menu when server status changes
    this.serverRunner.on('status-change', () => {
      this.updateContextMenu();
    });
  }

  updateContextMenu() {
    if (!this.tray) return;

    const status = this.serverRunner.getStatus();
    const serverRunning = status.isRunning;
    const pidText = status.pid ? ` (PID: ${status.pid})` : '';

    const menu = Menu.buildFromTemplate([
      {
        label: `Server: ${serverRunning ? '● Online' + pidText : '○ Offline'}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open Manager Window',
        click: () => this.showWindow(),
      },
      {
        label: serverRunning ? 'Stop Server' : 'Start Server',
        click: async () => {
          if (serverRunning) {
            await this.serverRunner.stopServer();
          } else {
            await this.serverRunner.startServer();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Manager (Keep Server Running)',
        click: () => {
          this.isQuitting = true;
          this.serverRunner.detachOnExit();
          app.quit();
        },
      },
      {
        label: 'Stop Server & Quit All',
        click: async () => {
          this.isQuitting = true;
          if (this.serverRunner.isRunning) {
            await this.serverRunner.stopServer();
          }
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(menu);
  }

  showWindow() {
    if (!this.win) return;
    if (this.win.isMinimized()) this.win.restore();
    this.win.show();
    this.win.focus();
  }

  hideToTray() {
    if (!this.win) return;
    this.win.hide();
    if (this.tray) {
      this.tray.displayBalloon?.({
        title: 'Hytale Server Manager',
        content: 'Running in low-resource background mode. Click the tray icon to restore.',
      });
    }
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = {
  TrayManager,
};
