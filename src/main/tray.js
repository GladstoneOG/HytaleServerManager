'use strict';
/**
 * System Tray & Ultra-Low Resource Background Mode
 * - Closing the window hides it to the tray (rendering suspended, ~0% CPU)
 * - Single-click the tray icon to open the window (Windows convention)
 * - Start/stop the server from the tray using the saved launch settings
 * - Quit the manager while leaving the server running
 */
const { app, Tray, Menu, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

class TrayManager {
  constructor({ win, serverRunner, getStartOptions } = {}) {
    this.win = win;
    this.serverRunner = serverRunner;
    this.getStartOptions = getStartOptions || (async () => ({}));
    this.tray = null;
    this.isQuitting = false;
    this.closeToTrayEnabled = true;
    this._balloonShown = false;
  }

  init() {
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
    this.updateContextMenu();

    this.tray.on('click', () => this.showWindow());
    this.tray.on('double-click', () => this.showWindow());

    // Update tray menu when server status changes
    this.serverRunner.on('status-change', () => this.updateContextMenu());
  }

  updateContextMenu() {
    if (!this.tray) return;

    const status = this.serverRunner.getStatus();
    const running = status.isRunning;

    this.tray.setToolTip(`Hytale Server Manager — ${running ? 'Server running' : 'Server stopped'}`);

    const menu = Menu.buildFromTemplate([
      {
        label: running ? `● Server running${status.pid ? `  (PID ${status.pid})` : ''}` : '○ Server stopped',
        enabled: false,
      },
      { type: 'separator' },
      { label: 'Open', click: () => this.showWindow() },
      {
        label: running ? 'Stop server' : 'Start server',
        click: async () => {
          try {
            if (running) {
              await this.serverRunner.stopServer();
            } else {
              await this.serverRunner.startServer(await this.getStartOptions());
            }
          } catch {}
        },
      },
      { type: 'separator' },
      {
        label: running ? 'Quit (keep server running)' : 'Quit',
        click: () => {
          this.isQuitting = true;
          this.serverRunner.detachOnExit();
          app.quit();
        },
      },
      {
        label: 'Stop server and quit',
        visible: running,
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
    if (!this.win || this.win.isDestroyed()) return;
    if (this.win.isMinimized()) this.win.restore();
    this.win.show();
    this.win.focus();
  }

  hideToTray() {
    if (!this.win) return;
    this.win.hide();
    // Only tell the user once per session; repeating it on every close is noisy
    if (this.tray && !this._balloonShown) {
      this._balloonShown = true;
      this.tray.displayBalloon?.({
        title: 'Still running in the tray',
        content: 'Hytale Server Manager is minimized. Click the tray icon to reopen.',
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
