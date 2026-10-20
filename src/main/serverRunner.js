'use strict';
/**
 * Server Process Runner & Console Manager for Hytale Server
 * Supports:
 * - Integrated Mode: Captures real-time stdout/stderr, piping to UI
 * - Detached / Independent Mode: Launches server in its own native console window
 *   allowing the user to close the Manager application without stopping the game server!
 * - Process Detach-on-Exit: Unrefs child process so Electron can quit while keeping server alive
 * - OS Process Detection: Detects existing HytaleServer.jar instances running on the machine
 * - Graceful shutdown and execution of stdin commands
 */
const { spawn, exec, execFile } = require('child_process');
const path = require('path');
const { EventEmitter } = require('events');
const { exists } = require('./util');

class ServerRunner extends EventEmitter {
  constructor({ serverDir = 'F:\\serverht\\Server' } = {}) {
    super();
    this.serverDir = serverDir;
    this.process = null;
    this.isRunning = false;
    this.isDetached = false;
    this.detachedPid = null;
    this.logs = [];
    this.maxLogLines = 2000;
    this._detachedCheckInterval = null;
  }

  setServerDir(dir) {
    this.serverDir = dir;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isDetached: this.isDetached,
      pid: this.process ? this.process.pid : this.detachedPid,
      serverDir: this.serverDir,
    };
  }

  /**
   * Check if an external or previously detached HytaleServer.jar process is running
   */
  async findRunningServerProcess() {
    // If managed integrated process is active
    if (this.isRunning && this.process) {
      return { isRunning: true, pid: this.process.pid, managed: true };
    }

    return new Promise((resolve) => {
      // Query OS process table specifically for java processes running HytaleServer.jar
      // IMPORTANT: Filter specifically by process executable name (java.exe / javaw.exe)
      // so the querying shell (powershell.exe / cmd.exe) does not match its own commandline!
      if (process.platform === 'win32') {
        execFile(
          'powershell.exe',
          [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            "Get-CimInstance Win32_Process -Filter \"(Name = 'java.exe' OR Name = 'javaw.exe') AND CommandLine LIKE '%HytaleServer.jar%'\" | Select-Object -ExpandProperty ProcessId",
          ],
          (err, stdout) => {
            if (err || !stdout || !stdout.trim()) {
              if (!this.process) {
                const wasRunning = this.isRunning;
                this.isRunning = false;
                this.isDetached = false;
                this.detachedPid = null;
                this._stopDetachedMonitor();
                if (wasRunning) {
                  this.emit('status-change', this.getStatus());
                }
              }
              return resolve({ isRunning: false, pid: null, managed: false });
            }

            const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
            const pid = parseInt(lines[0], 10);
            if (pid && !isNaN(pid)) {
              const wasRunning = this.isRunning;
              const prevPid = this.detachedPid;
              this.isRunning = true;
              this.isDetached = true;
              this.detachedPid = pid;
              this._startDetachedMonitor();
              if (!wasRunning || prevPid !== pid) {
                this.emit('status-change', this.getStatus());
              }
              return resolve({ isRunning: true, pid, managed: false });
            }

            if (!this.process) {
              this.isRunning = false;
              this.isDetached = false;
              this.detachedPid = null;
              this._stopDetachedMonitor();
              this.emit('status-change', this.getStatus());
            }
            resolve({ isRunning: false, pid: null, managed: false });
          }
        );
      } else {
        execFile('pgrep', ['-f', 'java.*HytaleServer\\.jar'], (err, stdout) => {
          if (err || !stdout || !stdout.trim()) {
            if (!this.process) {
              const wasRunning = this.isRunning;
              this.isRunning = false;
              this.isDetached = false;
              this.detachedPid = null;
              this._stopDetachedMonitor();
              if (wasRunning) {
                this.emit('status-change', this.getStatus());
              }
            }
            return resolve({ isRunning: false, pid: null, managed: false });
          }

          const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
          const pid = parseInt(lines[0], 10);
          if (pid && !isNaN(pid)) {
            const wasRunning = this.isRunning;
            const prevPid = this.detachedPid;
            this.isRunning = true;
            this.isDetached = true;
            this.detachedPid = pid;
            this._startDetachedMonitor();
            if (!wasRunning || prevPid !== pid) {
              this.emit('status-change', this.getStatus());
            }
            return resolve({ isRunning: true, pid, managed: false });
          }

          if (!this.process) {
            this.isRunning = false;
            this.isDetached = false;
            this.detachedPid = null;
            this._stopDetachedMonitor();
            this.emit('status-change', this.getStatus());
          }
          resolve({ isRunning: false, pid: null, managed: false });
        });
      }
    });
  }

  _startDetachedMonitor() {
    if (this._detachedCheckInterval) return;
    this._detachedCheckInterval = setInterval(async () => {
      if (!this.isRunning || !this.isDetached || this.process) {
        this._stopDetachedMonitor();
        return;
      }
      const st = await this.findRunningServerProcess();
      if (!st.isRunning) {
        this._stopDetachedMonitor();
      }
    }, 4000);
  }

  _stopDetachedMonitor() {
    if (this._detachedCheckInterval) {
      clearInterval(this._detachedCheckInterval);
      this._detachedCheckInterval = null;
    }
  }

  /**
   * Start the Hytale server process
   * @param {Object} options
   * @param {string} [options.mode='integrated'] 'integrated' (pipes to UI) or 'detached' (independent window)
   * @param {Array<string>} [options.jvmOptions]
   * @param {Array<string>} [options.extraArgs]
   */
  async startServer({
    mode = 'integrated',
    jvmOptions = ['-Xms4G', '-Xmx6G', '-XX:+UseG1GC'],
    extraArgs = [],
  } = {}) {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    const jarPath = path.join(this.serverDir, 'HytaleServer.jar');
    if (!(await exists(jarPath))) {
      throw new Error(`HytaleServer.jar not found at ${jarPath}`);
    }

    // Determine assets path
    let assetsPath = 'Assets.zip';
    if (await exists(path.join(this.serverDir, 'Assets.zip'))) {
      assetsPath = 'Assets.zip';
    } else if (await exists(path.join(path.dirname(this.serverDir), 'Assets.zip'))) {
      assetsPath = path.join('..', 'Assets.zip');
    }

    const javaArgs = [
      ...jvmOptions,
      '-jar',
      'HytaleServer.jar',
      '--assets',
      assetsPath,
      ...extraArgs,
    ];

    if (mode === 'detached') {
      // Launch in an independent Windows Terminal / Command Prompt window
      // The child process is completely unreferenced from Electron.
      // Closing Electron has ZERO effect on the server!
      this._appendLog(`[Manager] Launching Hytale Server in Independent Window (Detached Mode)...\n`);
      this._appendLog(`[Manager] You can close this manager anytime without stopping your server.\n`);

      const child = spawn('cmd.exe', ['/c', 'start', 'Hytale Server Main', 'java', ...javaArgs], {
        cwd: this.serverDir,
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });

      child.unref();
      this.isRunning = true;
      this.isDetached = true;
      this.detachedPid = child.pid;
      this.emit('status-change', this.getStatus());

      // Query actual java PID after launch
      setTimeout(() => this.findRunningServerProcess(), 2000);

      return this.getStatus();
    }

    // Integrated Mode: pipes stdout/stderr to manager UI
    this._appendLog(`[Manager] Starting Hytale Server in Integrated Mode: java ${javaArgs.join(' ')}\n`);

    this.process = spawn('java', javaArgs, {
      cwd: this.serverDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
      shell: false,
    });

    this.isRunning = true;
    this.isDetached = false;
    this.detachedPid = this.process.pid;
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
      this.isDetached = false;
      const msg = `[Manager] Server process exited with code ${code} (${signal || 'clean'})\n`;
      this._appendLog(msg);
      this.emit('log', { type: 'system', text: msg });
      this.emit('status-change', this.getStatus());
      this.process = null;
    });

    this.process.on('error', (err) => {
      this.isRunning = false;
      this.isDetached = false;
      const msg = `[Manager] Failed to launch server: ${err.message}\n`;
      this._appendLog(msg);
      this.emit('log', { type: 'error', text: msg });
      this.emit('status-change', this.getStatus());
      this.process = null;
    });

    return this.getStatus();
  }

  /**
   * Detach the managed process before Electron exits so the server survives
   */
  detachOnExit() {
    if (this.process && this.isRunning) {
      try {
        this.process.stdout.destroy();
        this.process.stderr.destroy();
        this.process.stdin.destroy();
        this.process.unref();
      } catch {}
    }
  }

  /**
   * Send console command to the server process stdin
   */
  sendCommand(cmd) {
    if (!this.isRunning) {
      throw new Error('Server is not running');
    }

    if (this.isDetached || !this.process || !this.process.stdin) {
      throw new Error('Server is running in an independent terminal window. Please use its console window directly.');
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
    if (!this.isRunning) {
      return { success: true, message: 'Server was not running' };
    }

    // If running in detached mode with PID
    if (this.isDetached && this.detachedPid) {
      this._stopDetachedMonitor();
      this._appendLog(`[Manager] Stopping detached server process (PID ${this.detachedPid})...\n`);
      return new Promise((resolve) => {
        exec(`taskkill /PID ${this.detachedPid} /T /F`, () => {
          this.isRunning = false;
          this.isDetached = false;
          this.detachedPid = null;
          this.emit('status-change', this.getStatus());
          resolve({ success: true, detached: true });
        });
      });
    }

    this._stopDetachedMonitor();

    if (this.process) {
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

    this.isRunning = false;
    this.emit('status-change', this.getStatus());
    return { success: true };
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
