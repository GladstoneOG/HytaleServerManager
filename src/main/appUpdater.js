'use strict';
/**
 * Launcher Application Auto-Updater
 * Checks GitHub repository (commits and releases) for updates to the Hytale Server Manager launcher.
 * Provides seamless 1-click update with Git pull or direct GitHub archive extraction fallback,
 * followed by automatic app restart.
 */
const { EventEmitter } = require('events');
const path = require('path');
const fsp = require('fs/promises');
const os = require('os');
const { execFile } = require('child_process');
const { getJson, downloadFile } = require('./http');
const { extract, listEntries } = require('./zip');
const { exists, ensureDir, isInside } = require('./util');

class AppUpdater extends EventEmitter {
  constructor(options = {}) {
    super();
    this.appDir = options.appDir || path.resolve(__dirname, '..', '..');
    this.repo = options.repo || 'GladstoneOG/HytaleServerManager';
    this.branch = options.branch || 'main';
    this.serverRunner = options.serverRunner || null;
    this.isUpdating = false;
    this.lastCheckResult = null;
  }

  /**
   * Determine the current local commit SHA
   */
  async getLocalCommit() {
    // 1. Check if git is available and query rev-parse HEAD
    try {
      const sha = await new Promise((resolve, reject) => {
        execFile('git', ['rev-parse', 'HEAD'], { cwd: this.appDir, windowsHide: true }, (err, stdout) => {
          if (err) return reject(err);
          resolve(stdout.trim());
        });
      });
      if (sha && sha.length >= 7) return sha;
    } catch {}

    // 2. Fallback to .current-commit file
    try {
      const commitFile = path.join(this.appDir, '.current-commit');
      if (await exists(commitFile)) {
        const text = (await fsp.readFile(commitFile, 'utf8')).trim();
        if (text) return text;
      }
    } catch {}

    return null;
  }

  /**
   * Get application version metadata
   */
  async getVersionInfo() {
    let version = '1.0.0';
    try {
      const pkgPath = path.join(this.appDir, 'package.json');
      if (await exists(pkgPath)) {
        const pkg = JSON.parse(await fsp.readFile(pkgPath, 'utf8'));
        if (pkg.version) version = pkg.version;
      }
    } catch {}

    const localCommit = await this.getLocalCommit();

    return {
      version,
      commit: localCommit ? localCommit.slice(0, 7) : 'unknown',
      fullCommit: localCommit,
      repo: this.repo,
      branch: this.branch,
      lastCheck: this.lastCheckResult,
    };
  }

  /**
   * Check GitHub repository for newer commits or releases
   */
  async checkForUpdates() {
    try {
      const localCommit = await this.getLocalCommit();
      const apiUrl = `https://api.github.com/repos/${this.repo}/commits/${this.branch}`;

      const data = await getJson(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HytaleServerManager-Updater',
        },
        timeout: 10000,
      });

      if (!data || !data.sha) {
        throw new Error('Unable to fetch latest commit from GitHub');
      }

      const remoteSha = data.sha;
      const remoteShortSha = remoteSha.slice(0, 7);
      const localShortSha = localCommit ? localCommit.slice(0, 7) : 'unknown';

      // Compare local SHA with remote SHA
      let updateAvailable = false;
      if (localCommit) {
        updateAvailable = localCommit.toLowerCase() !== remoteSha.toLowerCase();
      }

      const commitMessage = (data.commit?.message || '').split('\n')[0].trim();
      const commitAuthor = data.commit?.author?.name || data.commit?.committer?.name || 'GladstoneOG';
      const commitDate = data.commit?.committer?.date || data.commit?.author?.date || null;

      const result = {
        updateAvailable,
        localCommit: localShortSha,
        localFullSha: localCommit,
        remoteCommit: remoteShortSha,
        remoteFullSha: remoteSha,
        commitMessage,
        commitAuthor,
        commitDate,
        htmlUrl: data.html_url,
        checkedAt: new Date().toISOString(),
      };

      this.lastCheckResult = result;
      return result;
    } catch (err) {
      console.warn('[AppUpdater] Update check failed:', err.message);
      const fallbackResult = {
        updateAvailable: false,
        error: err.message,
        checkedAt: new Date().toISOString(),
      };
      this.lastCheckResult = fallbackResult;
      return fallbackResult;
    }
  }

  /**
   * Perform 1-click update: pull or download latest files and restart launcher
   */
  async performUpdate(onProgress) {
    if (this.isUpdating) {
      throw new Error('An update is already in progress');
    }
    this.isUpdating = true;

    const report = (stage, percent, message) => {
      const payload = { stage, percent, message };
      if (onProgress) onProgress(payload);
      this.emit('progress', payload);
    };

    try {
      // 1. If server is running, stop it gracefully so worlds/data are safely preserved
      if (this.serverRunner && this.serverRunner.isRunning) {
        report('stopping-server', 5, 'Gracefully stopping server before update...');
        try {
          await this.serverRunner.stopServer(3000);
        } catch (serverErr) {
          console.warn('[AppUpdater] Warning stopping server before update:', serverErr.message);
        }
      }

      // 2. Check if this is a Git clone with .git directory
      const gitDir = path.join(this.appDir, '.git');
      let usedGit = false;

      if (await exists(gitDir)) {
        try {
          report('check-git', 15, 'Checking Git repository...');
          await new Promise((resolve, reject) => {
            execFile('git', ['status'], { cwd: this.appDir, windowsHide: true }, (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
          usedGit = true;
        } catch {
          usedGit = false;
        }
      }

      if (usedGit) {
        // Method A: Git Fetch & Reset
        report('fetch', 30, 'Fetching latest changes from GitHub...');
        await new Promise((resolve, reject) => {
          execFile('git', ['fetch', 'origin', this.branch], { cwd: this.appDir, windowsHide: true }, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || err.message));
            resolve();
          });
        });

        report('pull', 70, 'Applying latest launcher update...');
        await new Promise((resolve, reject) => {
          execFile('git', ['reset', '--hard', `origin/${this.branch}`], { cwd: this.appDir, windowsHide: true }, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || err.message));
            resolve();
          });
        });

        const newSha = await this.getLocalCommit();
        if (newSha) {
          try {
            await fsp.writeFile(path.join(this.appDir, '.current-commit'), newSha, 'utf8');
          } catch {}
        }
      } else {
        // Method B: Direct ZIP Download from GitHub archive
        report('download', 20, 'Downloading latest launcher files from GitHub...');
        const zipUrl = `https://github.com/${this.repo}/archive/refs/heads/${this.branch}.zip`;
        const tempZip = path.join(os.tmpdir(), `hytale-launcher-update-${Date.now()}.zip`);

        await downloadFile(zipUrl, tempZip, {
          onProgress: ({ done, total }) => {
            const pct = total ? Math.min(55, 20 + Math.floor((done / total) * 35)) : 35;
            report('download', pct, `Downloading update (${Math.round(done / 1024)} KB)...`);
          },
        });

        report('extract', 60, 'Extracting updated launcher files...');

        // Inspect zip to determine prefix
        const entries = await listEntries(tempZip);
        let prefix = '';
        if (entries.length > 0 && entries[0].name.includes('/')) {
          prefix = entries[0].name.split('/')[0] + '/';
        }

        // Protected files / folders to never overwrite or delete
        const protectedItems = new Set([
          'node_modules',
          '.git',
          '.hytale-downloader-credentials.enc',
          '.hytale-downloader-credentials.json',
          'auth.enc.key',
          'config.json',
        ]);

        await extract(
          tempZip,
          (entryName) => {
            const rel = prefix && entryName.startsWith(prefix) ? entryName.slice(prefix.length) : entryName;
            if (!rel) return null;

            const rootSegment = rel.split('/')[0];
            if (protectedItems.has(rootSegment)) return null;

            const dest = path.join(this.appDir, ...rel.split('/'));
            return isInside(this.appDir, dest) ? dest : null;
          },
          ({ done, total }) => {
            const pct = total ? Math.min(90, 60 + Math.floor((done / total) * 30)) : 75;
            report('extract', pct, 'Writing updated launcher files...');
          }
        );

        // Update .current-commit file if remote SHA is known
        if (this.lastCheckResult?.remoteFullSha) {
          try {
            await fsp.writeFile(path.join(this.appDir, '.current-commit'), this.lastCheckResult.remoteFullSha, 'utf8');
          } catch {}
        }

        // Clean up temporary archive
        try {
          await fsp.rm(tempZip, { force: true });
        } catch {}
      }

      report('complete', 100, 'Launcher updated successfully! Restarting...');

      // Schedule relaunch
      setTimeout(() => {
        try {
          const { app } = require('electron');
          if (app) {
            app.relaunch();
            app.exit(0);
          }
        } catch (relaunchErr) {
          console.error('[AppUpdater] Automatic relaunch failed:', relaunchErr);
        }
      }, 1500);

      return { success: true };
    } catch (err) {
      console.error('[AppUpdater] Update failed:', err);
      report('error', 0, `Update failed: ${err.message}`);
      throw err;
    } finally {
      this.isUpdating = false;
    }
  }
}

module.exports = { AppUpdater };
