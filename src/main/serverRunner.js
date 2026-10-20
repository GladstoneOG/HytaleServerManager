'use strict';
/**
 * Server Process Runner & Console Manager for Hytale Server
 * Handles:
 * - Launching HytaleServer with configurable JVM options and assets
 * - Capturing real-time console stdout/stderr and piping to UI
 * - Executing console commands via process stdin
 * - Graceful shutdown and process status monitoring
 */
const { spawn } = require('child_process');
const path = require('path');
const { EventEmitter } = require('events');
const { exists } = require('./util');

class ServerRunner extends EventEmitter {
  constructor({ serverDir = 'F:\\serverht\\Server' } = {}) {
    super();
    this.serverDir = serverDir;
    this.process = null;
    this.isRunning = false;
    this.logs = [];
    this.maxLogLines = 2000;
  }

  setServerDir(dir) {
    this.serverDir = dir;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      pid: this.process ? this.process.pid : null,
      serverDir: this.serverDir,
    };
  }

  /**
   * Start the Hytale server process
   */
  async startServer({
    jvmOptions = ['-Xms4G', '-Xmx6G', '-XX:+UseG1GC'],
    extraArgs = [],
    useBatchFile = false,
  } = {}) {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    const jarPath = path.join(this.serverDir, 'HytaleServer.jar');
    if (!(await exists(jarPath))) {
      throw new Error(`HytaleServer.jar not found at ${jarPath}`);
    }

    // Determine assets path (in server dir or parent dir)
    let assetsPath = 'Assets.zip';
    if (await exists(path.join(this.serverDir, 'Assets.zip'))) {
      assetsPath = 'Assets.zip';
    } else if (await exists(path.join(path.dirname(this.serverDir), 'Assets.zip'))) {
      assetsPath = path.join('..', 'Assets.zip');
    }

    const args = [
      ...jvmOptions,
      '-jar',
      'HytaleServer.jar',
      '--assets',
      assetsPath,
      ...extraArgs,
    ];

    this._appendLog(`[Manager] Starting Hytale Server with java ${args.join(' ')}\n`);

    this.process = spawn('java', args, {
      cwd: this.serverDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    this.isRunning = true;
    this.emit('status-change', this.getStatus());

    this.process.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      this._appendLog(text);
      this.emit('log', { type: 'stdout', text });
    });

    this.process.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      this._appendLog(text);
      this.emit('log', { type: 'stderr', text });
    });

    this.process.on('close', (code, signal) => {
      this.isRunning = false;
      const msg = `[Manager] Server process exited with code ${code} (${signal || 'clean'})\n`;
      this._appendLog(msg);
      this.emit('log', { type: 'system', text: msg });
      this.emit('status-change', this.getStatus());
      this.process = null;
    });

    this.process.on('error', (err) => {
      this.isRunning = false;
      const msg = `[Manager] Failed to launch server: ${err.message}\n`;
      this._appendLog(msg);
      this.emit('log', { type: 'error', text: msg });
      this.emit('status-change', this.getStatus());
      this.process = null;
    });

    return this.getStatus();
  }

  /**
   * Send console command to the server process stdin
   */
  sendCommand(cmd) {
    if (!this.isRunning || !this.process || !this.process.stdin) {
      throw new Error('Server is not running');
    }

    const clean = `${String(cmd).trim()}\n`;
    this._appendLog(`> ${clean}`);
    this.emit('log', { type: 'stdin', text: `> ${clean}` });
    this.process.stdin.write(clean);
  }

  /**
   * Stop the server gracefully
   */
  async stopServer(timeoutMs = 15000) {
    if (!this.isRunning || !this.process) {
      return { success: true, message: 'Server was not running' };
    }

    this._appendLog('[Manager] Stopping server gracefully (sending stop command)...\n');
    try {
      this.sendCommand('stop');
    } catch {}

    const proc = this.process;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.isRunning && proc) {
          this._appendLog('[Manager] Server did not stop in time; forcing termination...\n');
          try {
            proc.kill('SIGKILL');
          } catch {}
        }
        resolve({ success: true, forced: true });
      }, timeoutMs);

      proc.once('close', () => {
        clearTimeout(timer);
        resolve({ success: true, forced: false });
      });
    });
  }

  _appendLog(text) {
    const lines = text.split(/\r?\n/);
    for (const l of lines) {
      if (l) this.logs.push(l);
    }
    if (this.logs.length > this.maxLogLines) {
      this.logs = this.logs.slice(-this.maxLogLines);
    }
  }

  getLogs() {
    return this.logs;
  }
}

module.exports = {
  ServerRunner,
};
