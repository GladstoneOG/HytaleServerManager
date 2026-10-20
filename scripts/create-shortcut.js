'use strict';
/**
 * Windows Shortcut Creator for Hytale Server Manager
 * Uses native Windows Script Host (cscript/wscript) to create valid .lnk files
 * on Desktop, Start Menu, and Project Root.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

function toVbsString(str) {
  return '"' + String(str || '').replace(/"/g, '""') + '"';
}

function createShortcut(options = {}) {
  if (process.platform !== 'win32') {
    return { success: true, platform: process.platform, created: [] };
  }

  const projectDir = path.resolve(__dirname, '..');
  let electronExe = null;

  // 1. Check if running inside Electron runtime
  if (process.versions && process.versions.electron && process.execPath) {
    electronExe = process.execPath;
  } else {
    const candidate = path.join(projectDir, 'node_modules', 'electron', 'dist', 'electron.exe');
    if (fs.existsSync(candidate)) {
      electronExe = candidate;
    }
  }

  const iconPath = path.join(projectDir, 'src', 'assets', 'tray-icon.ico');

  const locations = [];

  // 1. User Desktop
  const userProfile = process.env.USERPROFILE || '';
  const desktopDir = options.desktopDir || (userProfile ? path.join(userProfile, 'Desktop') : null);
  if (desktopDir && fs.existsSync(desktopDir)) {
    locations.push(path.join(desktopDir, 'Hytale Server Manager.lnk'));
  }

  // 2. Windows Start Menu Programs
  const appData = process.env.APPDATA || '';
  const startMenuDir = appData ? path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs') : null;
  if (startMenuDir && fs.existsSync(startMenuDir)) {
    locations.push(path.join(startMenuDir, 'Hytale Server Manager.lnk'));
  }

  // 3. Project Root
  locations.push(path.join(projectDir, 'Hytale Server Manager.lnk'));

  // 4. Known Server Folder
  try {
    const configPath = path.join(appData, 'hytale-server-manager', 'config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.serverDir && fs.existsSync(cfg.serverDir)) {
        locations.push(path.join(cfg.serverDir, 'Hytale Server Manager.lnk'));
      }
    }
  } catch {}

  const hasElectron = Boolean(electronExe && fs.existsSync(electronExe));
  const targetPath = hasElectron ? electronExe : path.join(projectDir, 'HytaleServerManager.vbs');
  const targetArgs = hasElectron ? '.' : '';

  const created = [];
  const uniqueLocations = Array.from(new Set(locations));

  // Build a temporary VBScript file to create all shortcuts via native WScript.Shell
  const vbsLines = [
    'Set WshShell = CreateObject("WScript.Shell")',
  ];

  uniqueLocations.forEach((lnkPath, i) => {
    const vName = `sc_${i}`;
    vbsLines.push(`Set ${vName} = WshShell.CreateShortcut(${toVbsString(lnkPath)})`);
    vbsLines.push(`${vName}.TargetPath = ${toVbsString(targetPath)}`);
    if (targetArgs) {
      vbsLines.push(`${vName}.Arguments = ${toVbsString(targetArgs)}`);
    }
    vbsLines.push(`${vName}.WorkingDirectory = ${toVbsString(projectDir)}`);
    if (fs.existsSync(iconPath)) {
      vbsLines.push(`${vName}.IconLocation = ${toVbsString(iconPath)}`);
    }
    vbsLines.push(`${vName}.Description = "Hytale Server Mod Manager & Auto-Updater"`);
    vbsLines.push(`${vName}.Save`);
  });

  const tempVbs = path.join(os.tmpdir(), `hytale_sc_${Date.now()}.vbs`);

  try {
    fs.writeFileSync(tempVbs, vbsLines.join('\r\n'), 'utf8');
    execSync(`cscript //nologo "${tempVbs}"`, {
      windowsHide: true,
      stdio: 'ignore',
      timeout: 8000,
    });

    uniqueLocations.forEach((lnk) => {
      if (fs.existsSync(lnk)) {
        created.push(lnk);
      }
    });
  } catch (err) {
    console.error('Shortcut creation failed:', err.message);
  } finally {
    try {
      if (fs.existsSync(tempVbs)) fs.unlinkSync(tempVbs);
    } catch {}
  }

  return { success: created.length > 0, created };
}

if (require.main === module) {
  try {
    const res = createShortcut();
    if (res.created && res.created.length > 0) {
      console.log('✓ Successfully created shortcut(s):');
      res.created.forEach((c) => console.log('  -', c));
    } else {
      console.log('Shortcut script finished.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

module.exports = { createShortcut };
