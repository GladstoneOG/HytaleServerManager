'use strict';

// DOM Elements
const navButtons = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const pageTitle = document.getElementById('page-title');
const toastContainer = document.getElementById('toast-container');

// Sidebar Elements
const sidebarServerBadge = document.getElementById('sidebar-server-badge');
const sidebarAccountPill = document.getElementById('sidebar-account-pill');
const sidebarAccountText = document.getElementById('sidebar-account-text');
const installedModsCountBadge = document.getElementById('installed-mods-count');
const quickServerBtn = document.getElementById('quick-server-btn');
const openServerFolderBtn = document.getElementById('open-server-folder-btn');

// Dashboard Elements
const serverNotInstalledBanner = document.getElementById('server-not-installed-banner');
const btnOpenInstallWizardDash = document.getElementById('btn-open-install-wizard-dash');
const btnTopbarInstallWizard = document.getElementById('btn-topbar-install-wizard');
const serverUpdateBanner = document.getElementById('server-update-banner');
const targetVersionTag = document.getElementById('target-version-tag');
const btnUpdateServerNow = document.getElementById('btn-update-server-now');
const updateProgressContainer = document.getElementById('update-progress-container');
const updateProgressFill = document.getElementById('update-progress-fill');
const updateProgressText = document.getElementById('update-progress-text');
const dashServerDir = document.getElementById('dash-server-dir');
const dashInstalledVer = document.getElementById('dash-installed-ver');
const dashUpstreamVer = document.getElementById('dash-upstream-ver');
const dashActiveProfile = document.getElementById('dash-active-profile');
const dashServerStatus = document.getElementById('dash-server-status');
const dashVersionBadge = document.getElementById('dash-version-badge');
const dashAuthBadge = document.getElementById('dash-auth-status-badge');
const dashCredsFile = document.getElementById('dash-creds-file');
const dashCredsBranch = document.getElementById('dash-creds-branch');
const btnCheckUpdates = document.getElementById('btn-check-updates');
const btnDashOpenMods = document.getElementById('btn-dash-open-mods');
const btnDashLoginHytale = document.getElementById('btn-dash-login-hytale');
const btnDashRefreshAuth = document.getElementById('btn-dash-refresh-auth');
const statTotalMods = document.getElementById('stat-total-mods');
const statEnabledMods = document.getElementById('stat-enabled-mods');
const statUpdatesMods = document.getElementById('stat-updates-mods');
const statActiveProfiles = document.getElementById('stat-active-profiles');

// Installed Mods Elements
const modsSearchInput = document.getElementById('mods-search-input');
const modsFilterStatus = document.getElementById('mods-filter-status');
const btnRefreshInstalledMods = document.getElementById('btn-refresh-installed-mods');
const btnOpenModsFolder = document.getElementById('btn-open-mods-folder');
const btnUpdateAllMods = document.getElementById('btn-update-all-mods');
const installedModsList = document.getElementById('installed-mods-list');

// CurseForge Elements
const cfSearchInput = document.getElementById('cf-search-input');
const cfCategorySelect = document.getElementById('cf-category-select');
const cfSortSelect = document.getElementById('cf-sort-select');
const btnCfSearch = document.getElementById('btn-cf-search');
const cfResultsGrid = document.getElementById('cf-results-grid');
const cfPrevPage = document.getElementById('cf-prev-page');
const cfNextPage = document.getElementById('cf-next-page');
const cfPageInfo = document.getElementById('cf-page-info');

// Thunderstore Elements
const tsSearchInput = document.getElementById('ts-search-input');
const tsSortSelect = document.getElementById('ts-sort-select');
const btnTsSearch = document.getElementById('btn-ts-search');
const btnTsRefresh = document.getElementById('btn-ts-refresh');
const tsResultsGrid = document.getElementById('ts-results-grid');

// Profiles Elements
const btnCreateProfile = document.getElementById('btn-create-profile');
const btnImportProfile = document.getElementById('btn-import-profile');
const profilesList = document.getElementById('profiles-list');

// Console Elements
const consoleOutput = document.getElementById('console-output');
const consoleInputForm = document.getElementById('console-input-form');
const consoleInput = document.getElementById('console-input');
const consoleAutoScroll = document.getElementById('console-autoscroll');
const btnClearConsole = document.getElementById('btn-clear-console');
const consoleLaunchMode = document.getElementById('console-launch-mode');
const detachedModeNotice = document.getElementById('detached-mode-notice');
const consoleStatusDot = document.getElementById('console-status-dot');
const consoleStatusBadge = document.getElementById('console-status-badge');

// Settings Elements
const settingsServerDir = document.getElementById('settings-server-dir');
const btnBrowseServerDir = document.getElementById('btn-browse-server-dir');
const settingsLaunchMode = document.getElementById('settings-launch-mode');
const settingsMaxRam = document.getElementById('settings-max-ram');
const settingsCloseToTray = document.getElementById('settings-close-to-tray');
const settingsPatchline = document.getElementById('settings-patchline');
const settingsCfApiKey = document.getElementById('settings-cf-api-key');
const btnSaveSettings = document.getElementById('btn-save-settings');
const deviceLoginDisplay = document.getElementById('device-login-display');
const loginUserCode = document.getElementById('login-user-code');
const btnOpenVerifyUrl = document.getElementById('btn-open-verify-url');
const btnCancelLogin = document.getElementById('btn-cancel-login');
const btnTriggerDeviceLogin = document.getElementById('btn-trigger-device-login');

// Modal Elements
const modModal = document.getElementById('mod-modal');
const modalModTitle = document.getElementById('modal-mod-title');
const modalModContent = document.getElementById('modal-mod-content');
const modalModFooter = document.getElementById('modal-mod-footer');
const modalCloseBtn = document.getElementById('modal-close-btn');

// Installation Wizard Elements
const installModal = document.getElementById('install-modal');
const modalInstallCloseBtn = document.getElementById('modal-install-close-btn');
const wizardTargetDir = document.getElementById('wizard-target-dir');
const wizardBtnBrowseDir = document.getElementById('wizard-btn-browse-dir');
const wizardLocalDetectedBadge = document.getElementById('wizard-local-detected-badge');
const wizardJavaStatus = document.getElementById('wizard-java-status');
const wizardJavaText = document.getElementById('wizard-java-text');
const wizardZipFilePicker = document.getElementById('wizard-zip-file-picker');
const wizardZipFileInput = document.getElementById('wizard-zip-file-input');
const wizardBtnBrowseZip = document.getElementById('wizard-btn-browse-zip');
const wizardServerName = document.getElementById('wizard-server-name');
const wizardGameMode = document.getElementById('wizard-game-mode');
const wizardPort = document.getElementById('wizard-port');
const wizardMaxPlayers = document.getElementById('wizard-max-players');
const wizardMotd = document.getElementById('wizard-motd');
const wizardProgressWrap = document.getElementById('wizard-progress-wrap');
const wizardProgressFill = document.getElementById('wizard-progress-fill');
const wizardProgressText = document.getElementById('wizard-progress-text');
const wizardBtnCancel = document.getElementById('wizard-btn-cancel');
const wizardBtnStart = document.getElementById('wizard-btn-start');

// State
let appConfig = null;
let currentInstalledMods = [];
let cfPageIndex = 0;
const CF_PAGE_SIZE = 18;
let activeDeviceAuth = null;
let commandHistory = [];
let historyIndex = -1;

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// TAB NAVIGATION
// ==========================================
function switchTab(tabId) {
  navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  tabPanes.forEach((pane) => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });

  const titles = {
    dashboard: 'Dashboard',
    'installed-mods': 'Installed Mods',
    curseforge: 'CurseForge Mod Browser',
    thunderstore: 'Thunderstore Mod Browser',
    profiles: 'Mod Profiles',
    console: 'Server Console',
    settings: 'Settings & Authentication',
  };
  pageTitle.textContent = titles[tabId] || 'Dashboard';

  if (tabId === 'installed-mods') loadInstalledMods();
  if (tabId === 'curseforge') loadCurseForgeMods();
  if (tabId === 'thunderstore') loadThunderstoreMods();
  if (tabId === 'profiles') loadProfiles();
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ==========================================
// INITIALIZATION
// ==========================================
async function init() {
  try {
    appConfig = await window.api.getConfig();
    if (appConfig.serverDir) {
      dashServerDir.textContent = appConfig.serverDir;
      settingsServerDir.value = appConfig.serverDir;
    }
    if (appConfig.patchline) {
      settingsPatchline.value = appConfig.patchline;
    }
    if (appConfig.cfApiKey) {
      settingsCfApiKey.value = appConfig.cfApiKey;
    }
    if (appConfig.launchMode) {
      if (consoleLaunchMode) consoleLaunchMode.value = appConfig.launchMode;
      if (settingsLaunchMode) settingsLaunchMode.value = appConfig.launchMode;
    }
    if (appConfig.maxRam && settingsMaxRam) {
      settingsMaxRam.value = appConfig.maxRam;
    }
    if (typeof appConfig.closeToTray === 'boolean' && settingsCloseToTray) {
      settingsCloseToTray.checked = appConfig.closeToTray;
    }
    if (detachedModeNotice && appConfig.launchMode === 'detached') {
      detachedModeNotice.classList.remove('hidden');
    }

    // Refresh components
    await refreshAccountStatus();
    await checkServerVersion();
    await loadInstalledMods();
    await refreshServerStatus();
    await loadCfCategories();
  } catch (e) {
    showToast(`Init error: ${e.message}`, 'error');
  }
}

// ==========================================
// ACCOUNT STATUS & LOGIN
// ==========================================
async function refreshAccountStatus() {
  try {
    const status = await window.api.getHytaleStatus();
    const dot = sidebarAccountPill.querySelector('.account-dot');

    if (status.authenticated && !status.isExpired) {
      dot.className = 'account-dot dot-green';
      sidebarAccountText.textContent = 'Hytale Connected';
      dashAuthBadge.className = 'badge badge-success';
      dashAuthBadge.textContent = 'Connected';
      dashCredsFile.textContent = status.credentialsPath || 'Found';
      dashCredsBranch.textContent = status.branch || 'release';
      btnDashLoginHytale.textContent = 'Reconnect Account';
    } else if (status.authenticated && status.isExpired) {
      dot.className = 'account-dot dot-yellow';
      sidebarAccountText.textContent = 'Token Expired';
      dashAuthBadge.className = 'badge badge-warning';
      dashAuthBadge.textContent = 'Expired';
    } else {
      dot.className = 'account-dot dot-gray';
      sidebarAccountText.textContent = 'Unlinked';
      dashAuthBadge.className = 'badge badge-offline';
      dashAuthBadge.textContent = 'Not Connected';
      dashCredsFile.textContent = 'No credentials file found';
    }
  } catch {
    sidebarAccountText.textContent = 'Auth Error';
  }
}

async function startHytaleDeviceLogin() {
  try {
    switchTab('settings');
    deviceLoginDisplay.classList.remove('hidden');
    loginUserCode.textContent = 'Requesting...';

    activeDeviceAuth = await window.api.startDeviceLogin();
    loginUserCode.textContent = activeDeviceAuth.user_code;

    // Start background poll
    const res = await window.api.pollDeviceLogin(activeDeviceAuth);
    if (res.success) {
      showToast('Successfully authenticated with Hytale!', 'success');
      deviceLoginDisplay.classList.add('hidden');
      await refreshAccountStatus();
      await checkServerVersion();
    } else {
      showToast(`Login failed: ${res.error}`, 'error');
    }
  } catch (e) {
    showToast(`Login error: ${e.message}`, 'error');
  }
}

btnDashLoginHytale.addEventListener('click', startHytaleDeviceLogin);
btnTriggerDeviceLogin.addEventListener('click', startHytaleDeviceLogin);
btnDashRefreshAuth.addEventListener('click', async () => {
  await refreshAccountStatus();
  showToast('Account status refreshed', 'info');
});

btnOpenVerifyUrl.addEventListener('click', () => {
  if (activeDeviceAuth && activeDeviceAuth.verification_uri_complete) {
    window.api.openExternal(activeDeviceAuth.verification_uri_complete);
  }
});

btnCancelLogin.addEventListener('click', async () => {
  await window.api.cancelLogin();
  deviceLoginDisplay.classList.add('hidden');
  showToast('Login cancelled', 'info');
});

// ==========================================
// SERVER VERSION & UPDATER
// ==========================================
async function checkServerVersion() {
  try {
    dashInstalledVer.textContent = 'Checking...';
    dashUpstreamVer.textContent = 'Checking...';

    const res = await window.api.checkServerVersion(appConfig?.patchline || 'release');

    dashInstalledVer.textContent = res.installedVersion || (res.installed ? 'Unknown' : 'Not Installed');
    dashVersionBadge.textContent = res.installedVersion ? `v${res.installedVersion}` : 'No Jar';

    if (!res.installed) {
      serverNotInstalledBanner.classList.remove('hidden');
      serverUpdateBanner.classList.add('hidden');
    } else {
      serverNotInstalledBanner.classList.add('hidden');
    }

    if (res.latestVersion) {
      dashUpstreamVer.textContent = `v${res.latestVersion}`;
    } else if (res.authRequired) {
      dashUpstreamVer.textContent = 'Connect Hytale Account';
    } else {
      dashUpstreamVer.textContent = 'Unknown';
    }

    if (res.installed && res.updateAvailable && res.latestVersion) {
      serverUpdateBanner.classList.remove('hidden');
      targetVersionTag.textContent = res.latestVersion;
    } else {
      serverUpdateBanner.classList.add('hidden');
    }
  } catch (e) {
    dashInstalledVer.textContent = 'Error';
    dashUpstreamVer.textContent = 'Error';
  }
}

btnCheckUpdates.addEventListener('click', async () => {
  await checkServerVersion();
  showToast('Server version check complete', 'info');
});

btnUpdateServerNow.addEventListener('click', async () => {
  if (!confirm('Start automatic server update? The server will download the latest package, backup existing binaries, and extract the update.')) {
    return;
  }

  btnUpdateServerNow.disabled = true;
  updateProgressContainer.classList.remove('hidden');
  updateProgressFill.style.width = '0%';
  updateProgressText.textContent = 'Starting server update...';

  const unlisten = window.api.onServerUpdateProgress((p) => {
    if (p.total && p.done) {
      const pct = Math.min(100, Math.round((p.done / p.total) * 100));
      updateProgressFill.style.width = `${pct}%`;
    }
    if (p.message) {
      updateProgressText.textContent = p.message;
    }
  });

  try {
    const res = await window.api.performServerUpdate(appConfig?.patchline || 'release');
    if (res.success) {
      showToast(`Server updated to v${res.newVersion}!`, 'success');
      serverUpdateBanner.classList.add('hidden');
      await checkServerVersion();
    } else {
      showToast(`Update failed: ${res.error}`, 'error');
    }
  } catch (e) {
    showToast(`Update error: ${e.message}`, 'error');
  } finally {
    btnUpdateServerNow.disabled = false;
    updateProgressContainer.classList.add('hidden');
    unlisten();
  }
});

// ==========================================
// SERVER INSTALLATION WIZARD
// ==========================================
async function openInstallWizard() {
  installModal.classList.remove('hidden');
  wizardProgressWrap.classList.add('hidden');
  wizardProgressFill.style.width = '0%';
  wizardBtnStart.disabled = false;

  // Set default target directory from current app config or input
  if (appConfig?.serverDir) {
    wizardTargetDir.value = appConfig.serverDir;
  }

  // Check Java runtime status
  try {
    const javaInfo = await window.api.checkJava();
    if (javaInfo.installed) {
      wizardJavaText.innerHTML = `<span class="text-success">${escapeHtml(javaInfo.version)} (Detected)</span> — ${
        javaInfo.isJava25Recommended ? 'Meets recommended Java 25 requirement.' : 'Java found. Java 25 recommended for production.'
      }`;
    } else {
      wizardJavaText.innerHTML = `<span class="text-danger">Java not found in PATH</span> — Please install Java 25 (Adoptium Temurin) to run the server.`;
    }
  } catch {
    wizardJavaText.textContent = 'Could not probe Java version.';
  }

  // Detect local client installation
  try {
    const local = await window.api.detectClientInstall();
    if (local.detected) {
      wizardLocalDetectedBadge.classList.remove('hidden');
      wizardLocalDetectedBadge.textContent = 'Detected on PC ✓';
      // Default select local_client
      const localRadio = document.querySelector('input[name="wizard-source"][value="local_client"]');
      if (localRadio) localRadio.checked = true;
      wizardZipFilePicker.classList.add('hidden');
    } else {
      wizardLocalDetectedBadge.classList.add('hidden');
      const dlRadio = document.querySelector('input[name="wizard-source"][value="download"]');
      if (dlRadio) dlRadio.checked = true;
      wizardZipFilePicker.classList.add('hidden');
    }
  } catch {
    wizardLocalDetectedBadge.classList.add('hidden');
  }
}

// Source radio buttons change listener
document.querySelectorAll('input[name="wizard-source"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'zip_file') {
      wizardZipFilePicker.classList.remove('hidden');
    } else {
      wizardZipFilePicker.classList.add('hidden');
    }
  });
});

wizardBtnBrowseDir.addEventListener('click', async () => {
  const chosen = await window.api.selectServerDir();
  if (chosen) {
    wizardTargetDir.value = chosen;
  }
});

wizardBtnBrowseZip.addEventListener('click', async () => {
  const zip = await window.api.selectZipFileDialog();
  if (zip) {
    wizardZipFileInput.value = zip;
  }
});

modalInstallCloseBtn.addEventListener('click', () => {
  installModal.classList.add('hidden');
});

wizardBtnCancel.addEventListener('click', () => {
  window.api.cancelServerInstall();
  installModal.classList.add('hidden');
});

btnTopbarInstallWizard.addEventListener('click', openInstallWizard);
if (btnOpenInstallWizardDash) {
  btnOpenInstallWizardDash.addEventListener('click', openInstallWizard);
}

wizardBtnStart.addEventListener('click', async () => {
  const targetDir = wizardTargetDir.value.trim();
  if (!targetDir) {
    showToast('Please select a target server folder', 'error');
    return;
  }

  const selectedSource = document.querySelector('input[name="wizard-source"]:checked')?.value || 'local_client';
  const zipPath = wizardZipFileInput.value.trim();

  if (selectedSource === 'zip_file' && !zipPath) {
    showToast('Please browse and select an existing server .zip file', 'error');
    return;
  }

  const serverName = wizardServerName.value.trim() || 'My Hytale Server';
  const motd = wizardMotd.value.trim() || 'Welcome to our Hytale Server!';
  const port = parseInt(wizardPort.value, 10) || 5520;
  const maxPlayers = parseInt(wizardMaxPlayers.value, 10) || 20;
  const gameMode = wizardGameMode.value;

  wizardBtnStart.disabled = true;
  wizardProgressWrap.classList.remove('hidden');
  wizardProgressFill.style.width = '0%';
  wizardProgressText.textContent = 'Starting server installation...';

  const unlistenProgress = window.api.onInstallerProgress((p) => {
    if (p.total && p.done) {
      const pct = Math.min(100, Math.round((p.done / p.total) * 100));
      wizardProgressFill.style.width = `${pct}%`;
    }
    if (p.message) {
      wizardProgressText.textContent = p.message;
    }
  });

  try {
    const res = await window.api.initializeServer(targetDir, {
      source: selectedSource,
      zipPath,
      serverName,
      motd,
      port,
      maxPlayers,
      gameMode,
    });

    if (res.success) {
      showToast(`Hytale Server successfully installed in ${targetDir}!`, 'success');
      installModal.classList.add('hidden');

      // Refresh app view with newly initialized server
      appConfig.serverDir = targetDir;
      dashServerDir.textContent = targetDir;
      settingsServerDir.value = targetDir;

      await checkServerVersion();
      await loadInstalledMods();
      await refreshAccountStatus();
    } else {
      showToast(`Installation failed: ${res.error}`, 'error');
      wizardBtnStart.disabled = false;
    }
  } catch (err) {
    showToast(`Installation error: ${err.message}`, 'error');
    wizardBtnStart.disabled = false;
  } finally {
    unlistenProgress();
  }
});

// ==========================================
// INSTALLED MODS MANAGEMENT
// ==========================================
async function loadInstalledMods(checkRemoteUpdates = true) {
  try {
    installedModsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <p>Scanning installed mods...</p>
      </div>`;

    const mods = await window.api.getInstalledMods(checkRemoteUpdates);
    currentInstalledMods = mods;

    // Update stats
    const total = mods.length;
    const enabled = mods.filter((m) => m.isEnabled).length;
    const updates = mods.filter((m) => m.updateAvailable).length;

    statTotalMods.textContent = total;
    statEnabledMods.textContent = enabled;
    statUpdatesMods.textContent = updates;
    installedModsCountBadge.textContent = total;

    if (updates > 0) {
      btnUpdateAllMods.classList.remove('hidden');
      btnUpdateAllMods.textContent = `⚡ Update All (${updates})`;
    } else {
      btnUpdateAllMods.classList.add('hidden');
    }

    renderInstalledModsList();
  } catch (e) {
    installedModsList.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to scan mods: ${e.message}</p></div>`;
  }
}

function renderInstalledModsList() {
  const query = modsSearchInput.value.trim().toLowerCase();
  const filter = modsFilterStatus.value;

  let filtered = currentInstalledMods.filter((m) => {
    if (query) {
      const nameMatch = (m.manifest.name || '').toLowerCase().includes(query);
      const fileMatch = m.fileName.toLowerCase().includes(query);
      const descMatch = (m.manifest.description || '').toLowerCase().includes(query);
      if (!nameMatch && !fileMatch && !descMatch) return false;
    }

    if (filter === 'enabled') return m.isEnabled;
    if (filter === 'disabled') return !m.isEnabled;
    if (filter === 'updates') return m.updateAvailable;
    return true;
  });

  if (filtered.length === 0) {
    installedModsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>No matching mods found.</p>
      </div>`;
    return;
  }

  installedModsList.innerHTML = '';
  filtered.forEach((m) => {
    const card = document.createElement('div');
    card.className = 'mod-row-card';

    const sourceBadge =
      m.source === 'curseforge'
        ? '<span class="badge badge-warning">CurseForge</span>'
        : m.source === 'thunderstore'
        ? '<span class="badge badge-info">Thunderstore</span>'
        : '<span class="badge badge-offline">Local</span>';

    const updateBadge = m.updateAvailable
      ? `<span class="badge badge-warning">Update Available</span>`
      : '';

    const authors = (m.manifest.authors || []).map((a) => (typeof a === 'string' ? a : a.Name)).join(', ');

    card.innerHTML = `
      <div class="mod-toggle-col">
        <label class="switch">
          <input type="checkbox" class="mod-toggle-cb" data-file="${m.fileName}" ${m.isEnabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>

      <div class="mod-info-col">
        <div class="mod-title-row">
          <span class="mod-name">${escapeHtml(m.manifest.name)}</span>
          <span class="mod-ver">v${escapeHtml(m.manifest.version)}</span>
          ${sourceBadge}
          ${updateBadge}
        </div>
        <div class="mod-desc">${escapeHtml(m.manifest.description || 'No description provided.')}</div>
        <div class="mod-meta-row">
          <span>File: <code>${escapeHtml(m.fileName)}</code></span>
          <span>Size: ${(m.size / 1024).toFixed(0)} KB</span>
          ${authors ? `<span>By: ${escapeHtml(authors)}</span>` : ''}
        </div>
      </div>

      <div class="mod-actions-col">
        ${
          m.updateAvailable
            ? `<button class="btn btn-accent btn-sm btn-update-mod" data-file="${m.fileName}">Update</button>`
            : ''
        }
        <button class="btn btn-danger btn-sm btn-delete-mod" data-file="${m.fileName}" title="Delete mod">🗑️</button>
      </div>
    `;

    // Toggle listener
    card.querySelector('.mod-toggle-cb').addEventListener('change', async (e) => {
      const enable = e.target.checked;
      try {
        await window.api.setModEnabled(m.fileName, enable);
        showToast(`${m.manifest.name} ${enable ? 'enabled' : 'disabled'}`, 'success');
        await loadInstalledMods(false);
      } catch (err) {
        showToast(`Failed to toggle: ${err.message}`, 'error');
        e.target.checked = !enable;
      }
    });

    // Update listener
    const updateBtn = card.querySelector('.btn-update-mod');
    if (updateBtn) {
      updateBtn.addEventListener('click', async () => {
        updateBtn.disabled = true;
        updateBtn.textContent = 'Updating...';
        try {
          const res = await window.api.updateMod(m);
          if (res.success) {
            showToast(`Updated ${m.manifest.name}!`, 'success');
            await loadInstalledMods(true);
          } else {
            showToast(`Update failed: ${res.error}`, 'error');
            updateBtn.disabled = false;
            updateBtn.textContent = 'Update';
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error');
          updateBtn.disabled = false;
          updateBtn.textContent = 'Update';
        }
      });
    }

    // Delete listener
    card.querySelector('.btn-delete-mod').addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete ${m.manifest.name} (${m.fileName})?`)) {
        try {
          await window.api.deleteMod(m.fileName, false);
          showToast(`Deleted ${m.manifest.name}`, 'info');
          await loadInstalledMods(false);
        } catch (err) {
          showToast(`Delete failed: ${err.message}`, 'error');
        }
      }
    });

    installedModsList.appendChild(card);
  });
}

modsSearchInput.addEventListener('input', renderInstalledModsList);
modsFilterStatus.addEventListener('change', renderInstalledModsList);
btnRefreshInstalledMods.addEventListener('click', () => loadInstalledMods(true));
btnDashOpenMods.addEventListener('click', () => switchTab('installed-mods'));

btnOpenModsFolder.addEventListener('click', () => {
  if (appConfig?.serverDir) {
    window.api.openPath(`${appConfig.serverDir}\\mods`);
  }
});

btnUpdateAllMods.addEventListener('click', async () => {
  const toUpdate = currentInstalledMods.filter((m) => m.updateAvailable);
  if (toUpdate.length === 0) return;
  if (!confirm(`Update all ${toUpdate.length} available mod updates?`)) return;

  btnUpdateAllMods.disabled = true;
  for (const m of toUpdate) {
    try {
      showToast(`Updating ${m.manifest.name}...`, 'info');
      await window.api.updateMod(m);
    } catch (e) {
      showToast(`Failed ${m.manifest.name}: ${e.message}`, 'error');
    }
  }
  btnUpdateAllMods.disabled = false;
  await loadInstalledMods(true);
});

// ==========================================
// CURSEFORGE BROWSER
// ==========================================
async function loadCfCategories() {
  try {
    const cats = await window.api.getCfCategories();
    cfCategorySelect.innerHTML = '<option value="">All Categories</option>';
    cats.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      cfCategorySelect.appendChild(opt);
    });
  } catch {}
}

async function loadCurseForgeMods() {
  try {
    cfResultsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <p>Loading CurseForge mods...</p>
      </div>`;

    const searchFilter = cfSearchInput.value.trim();
    const sortField = parseInt(cfSortSelect.value, 10);
    const categoryId = cfCategorySelect.value ? parseInt(cfCategorySelect.value, 10) : null;

    const res = await window.api.searchCurseForge({
      searchFilter,
      sortField,
      categoryId,
      pageSize: CF_PAGE_SIZE,
      index: cfPageIndex * CF_PAGE_SIZE,
    });

    const mods = res.data || [];
    const total = res.pagination?.totalCount || 0;
    const maxPages = Math.ceil(total / CF_PAGE_SIZE);

    cfPageInfo.textContent = `Page ${cfPageIndex + 1} of ${Math.max(1, maxPages)}`;
    cfPrevPage.disabled = cfPageIndex === 0;
    cfNextPage.disabled = cfPageIndex >= maxPages - 1;

    if (mods.length === 0) {
      cfResultsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>No CurseForge mods found matching your query.</p>
        </div>`;
      return;
    }

    cfResultsGrid.innerHTML = '';
    mods.forEach((mod) => {
      const card = document.createElement('div');
      card.className = 'mod-grid-card';

      const avatar = mod.logo?.thumbnailUrl
        ? `<img class="mod-avatar" src="${mod.logo.thumbnailUrl}" alt="">`
        : `<div class="mod-avatar-placeholder">⚔️</div>`;

      const authorName = (mod.authors || []).map((a) => a.name).join(', ') || 'Unknown';
      const downloads = mod.downloadCount ? formatNumber(mod.downloadCount) : '0';
      const latestFile = mod.latestFiles && mod.latestFiles.length > 0 ? mod.latestFiles[0] : null;

      // Check if installed locally
      const installedMatch = currentInstalledMods.find(
        (m) =>
          m.remoteId === mod.id ||
          m.manifest.name.toLowerCase() === mod.name.toLowerCase()
      );

      let actionBtnText = 'Install';
      let actionBtnClass = 'btn-primary';
      let isInstalled = false;

      if (installedMatch) {
        isInstalled = true;
        if (installedMatch.updateAvailable) {
          actionBtnText = 'Update';
          actionBtnClass = 'btn-accent';
        } else {
          actionBtnText = 'Installed ✓';
          actionBtnClass = 'btn-secondary';
        }
      }

      card.innerHTML = `
        <div class="mod-grid-top">
          ${avatar}
          <div class="mod-grid-title-area">
            <div class="mod-grid-title" title="${escapeHtml(mod.name)}">${escapeHtml(mod.name)}</div>
            <div class="mod-grid-author">By ${escapeHtml(authorName)}</div>
          </div>
        </div>
        <div class="mod-grid-summary">${escapeHtml(mod.summary || 'No summary available.')}</div>
        <div class="mod-grid-stats">
          <span>📥 ${downloads} dl</span>
          <span>${latestFile ? `v${escapeHtml(latestFile.displayName || latestFile.fileName)}` : ''}</span>
        </div>
        <div class="mod-grid-footer">
          <button class="btn btn-secondary btn-sm btn-cf-details">Details</button>
          <button class="btn ${actionBtnClass} btn-sm btn-cf-install" ${isInstalled && !installedMatch?.updateAvailable ? 'disabled' : ''}>${actionBtnText}</button>
        </div>
      `;

      // Details button
      card.querySelector('.btn-cf-details').addEventListener('click', async () => {
        openModModal(mod, latestFile);
      });

      // Install button
      const installBtn = card.querySelector('.btn-cf-install');
      if (installBtn && (!isInstalled || installedMatch?.updateAvailable)) {
        installBtn.addEventListener('click', async () => {
          if (!latestFile) {
            showToast('No downloadable file available for this mod', 'error');
            return;
          }
          installBtn.disabled = true;
          installBtn.textContent = 'Installing...';

          try {
            const res = await window.api.installCfMod(mod, latestFile, true);
            if (res.success) {
              showToast(`Installed ${mod.name}!`, 'success');
              installBtn.textContent = 'Installed ✓';
              installBtn.className = 'btn btn-secondary btn-sm';
              await loadInstalledMods(false);
            } else {
              showToast(`Install failed: ${res.error}`, 'error');
              installBtn.disabled = false;
              installBtn.textContent = actionBtnText;
            }
          } catch (err) {
            showToast(`Install error: ${err.message}`, 'error');
            installBtn.disabled = false;
            installBtn.textContent = actionBtnText;
          }
        });
      }

      cfResultsGrid.appendChild(card);
    });
  } catch (e) {
    cfResultsGrid.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to search CurseForge: ${e.message}</p></div>`;
  }
}

btnCfSearch.addEventListener('click', () => {
  cfPageIndex = 0;
  loadCurseForgeMods();
});
cfSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    cfPageIndex = 0;
    loadCurseForgeMods();
  }
});
cfSortSelect.addEventListener('change', () => {
  cfPageIndex = 0;
  loadCurseForgeMods();
});
cfCategorySelect.addEventListener('change', () => {
  cfPageIndex = 0;
  loadCurseForgeMods();
});

cfPrevPage.addEventListener('click', () => {
  if (cfPageIndex > 0) {
    cfPageIndex--;
    loadCurseForgeMods();
  }
});
cfNextPage.addEventListener('click', () => {
  cfPageIndex++;
  loadCurseForgeMods();
});

// ==========================================
// THUNDERSTORE BROWSER
// ==========================================
async function loadThunderstoreMods() {
  try {
    tsResultsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <p>Loading Thunderstore packages for Hytale...</p>
      </div>`;

    const searchFilter = tsSearchInput.value.trim();
    const sort = tsSortSelect.value;

    const pkgs = await window.api.searchThunderstore({
      searchFilter,
      sort,
    });

    if (pkgs.length === 0) {
      tsResultsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚡</div>
          <p>No Thunderstore packages found.</p>
        </div>`;
      return;
    }

    tsResultsGrid.innerHTML = '';
    pkgs.forEach((pkg) => {
      const card = document.createElement('div');
      card.className = 'mod-grid-card';

      const avatar = pkg.icon_url
        ? `<img class="mod-avatar" src="${pkg.icon_url}" alt="">`
        : `<div class="mod-avatar-placeholder">⚡</div>`;

      const downloads = pkg.download_count ? formatNumber(pkg.download_count) : '0';

      const isInstalled = currentInstalledMods.some(
        (m) =>
          m.remoteId === `${pkg.namespace}/${pkg.name}` ||
          m.manifest.name.toLowerCase() === pkg.name.toLowerCase()
      );

      card.innerHTML = `
        <div class="mod-grid-top">
          ${avatar}
          <div class="mod-grid-title-area">
            <div class="mod-grid-title" title="${escapeHtml(pkg.name)}">${escapeHtml(pkg.name)}</div>
            <div class="mod-grid-author">By ${escapeHtml(pkg.namespace)}</div>
          </div>
        </div>
        <div class="mod-grid-summary">${escapeHtml(pkg.description || 'No description.')}</div>
        <div class="mod-grid-stats">
          <span>📥 ${downloads} dl</span>
          <span>${pkg.categories ? pkg.categories.map((c) => c.name).join(', ') : ''}</span>
        </div>
        <div class="mod-grid-footer">
          <button class="btn ${isInstalled ? 'btn-secondary' : 'btn-primary'} btn-sm btn-ts-install" ${isInstalled ? 'disabled' : ''}>
            ${isInstalled ? 'Installed ✓' : 'Install'}
          </button>
        </div>
      `;

      const installBtn = card.querySelector('.btn-ts-install');
      if (installBtn && !isInstalled) {
        installBtn.addEventListener('click', async () => {
          installBtn.disabled = true;
          installBtn.textContent = 'Installing...';
          try {
            const res = await window.api.installThunderstore(pkg);
            if (res.success) {
              showToast(`Installed ${pkg.name}!`, 'success');
              installBtn.textContent = 'Installed ✓';
              installBtn.className = 'btn btn-secondary btn-sm';
              await loadInstalledMods(false);
            } else {
              showToast(`Install failed: ${res.error}`, 'error');
              installBtn.disabled = false;
              installBtn.textContent = 'Install';
            }
          } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
            installBtn.disabled = false;
            installBtn.textContent = 'Install';
          }
        });
      }

      tsResultsGrid.appendChild(card);
    });
  } catch (e) {
    tsResultsGrid.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to search Thunderstore: ${e.message}</p></div>`;
  }
}

btnTsSearch.addEventListener('click', loadThunderstoreMods);
btnTsRefresh.addEventListener('click', loadThunderstoreMods);
tsSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadThunderstoreMods();
});
tsSortSelect.addEventListener('change', loadThunderstoreMods);

// ==========================================
// MOD DETAILS MODAL
// ==========================================
async function openModModal(mod, latestFile) {
  modalModTitle.textContent = mod.name;
  modalModContent.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Loading description...</p></div>';
  modModal.classList.remove('hidden');

  try {
    const desc = await window.api.getCfDescription(mod.id);
    modalModContent.innerHTML = desc || mod.summary || 'No detailed description available.';
  } catch {
    modalModContent.innerHTML = mod.summary || 'Failed to load full description.';
  }

  modalModFooter.innerHTML = `
    <button class="btn btn-secondary" id="modal-close-action">Close</button>
    <button class="btn btn-primary" id="modal-install-action">Install Mod</button>
  `;

  document.getElementById('modal-close-action').addEventListener('click', () => {
    modModal.classList.add('hidden');
  });

  document.getElementById('modal-install-action').addEventListener('click', async () => {
    if (!latestFile) return;
    try {
      const res = await window.api.installCfMod(mod, latestFile, true);
      if (res.success) {
        showToast(`Installed ${mod.name}!`, 'success');
        modModal.classList.add('hidden');
        await loadInstalledMods(false);
      } else {
        showToast(`Install failed: ${res.error}`, 'error');
      }
    } catch (e) {
      showToast(`Install error: ${e.message}`, 'error');
    }
  });
}

modalCloseBtn.addEventListener('click', () => modModal.classList.add('hidden'));

// ==========================================
// PROFILES
// ==========================================
async function loadProfiles() {
  try {
    profilesList.innerHTML = '<div class="empty-state"><p>Loading profiles...</p></div>';
    const profiles = await window.api.getProfiles();

    profilesList.innerHTML = '';
    statActiveProfiles.textContent = profiles.length;

    profiles.forEach((p) => {
      const card = document.createElement('div');
      card.className = `profile-card ${p.active ? 'active-profile' : ''}`;

      card.innerHTML = `
        <div class="profile-card-header">
          <span class="profile-card-title">${escapeHtml(p.name)}</span>
          ${p.active ? '<span class="badge badge-success">Active</span>' : ''}
        </div>
        <div class="profile-card-desc">${escapeHtml(p.description || 'Configured mod profile snapshot.')}</div>
        <div class="info-row">
          <span class="info-label">Mods Count:</span>
          <span class="info-value">${p.modCount || 0}</span>
        </div>
        <div class="profile-card-footer">
          <button class="btn ${p.active ? 'btn-secondary' : 'btn-primary'} btn-sm btn-activate-profile" ${p.active ? 'disabled' : ''}>
            ${p.active ? 'Active' : 'Activate'}
          </button>
          <button class="btn btn-secondary btn-sm btn-export-profile">Export</button>
        </div>
      `;

      card.querySelector('.btn-activate-profile').addEventListener('click', async () => {
        try {
          await window.api.activateProfile(p.name);
          dashActiveProfile.textContent = p.name;
          showToast(`Activated profile ${p.name}!`, 'success');
          await loadProfiles();
          await loadInstalledMods(false);
        } catch (e) {
          showToast(`Failed to activate: ${e.message}`, 'error');
        }
      });

      card.querySelector('.btn-export-profile').addEventListener('click', async () => {
        try {
          const res = await window.api.exportProfileDialog(p.name);
          if (res.success) {
            showToast(`Exported profile to ${res.path}!`, 'success');
          }
        } catch (e) {
          showToast(`Export failed: ${e.message}`, 'error');
        }
      });

      profilesList.appendChild(card);
    });
  } catch (e) {
    profilesList.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load profiles: ${e.message}</p></div>`;
  }
}

btnCreateProfile.addEventListener('click', async () => {
  const name = prompt('Enter a name for the new profile:');
  if (!name) return;
  const desc = prompt('Enter a short description (optional):') || '';
  try {
    await window.api.createProfile(name, desc);
    showToast(`Profile ${name} created!`, 'success');
    await loadProfiles();
  } catch (e) {
    showToast(`Failed to create profile: ${e.message}`, 'error');
  }
});

btnImportProfile.addEventListener('click', async () => {
  try {
    const res = await window.api.importProfileDialog();
    if (res.success) {
      showToast(`Imported profile ${res.profileName} (${res.downloadedCount} mods auto-downloaded)!`, 'success');
      await loadProfiles();
      await loadInstalledMods(false);
    }
  } catch (e) {
    showToast(`Import error: ${e.message}`, 'error');
  }
});

// ==========================================
// SERVER CONSOLE & RUNNER
// ==========================================
async function refreshServerStatus() {
  try {
    const st = await window.api.getServerStatus();
    updateServerStatusUI(st);
  } catch {}
}

function updateServerStatusUI(status) {
  if (status.isRunning) {
    sidebarServerBadge.className = 'badge badge-online';
    sidebarServerBadge.textContent = 'Server Online';
    quickServerBtn.textContent = '⏹ Stop Server';
    quickServerBtn.className = 'btn btn-danger btn-sm';
    if (consoleStatusDot) consoleStatusDot.className = 'console-dot dot-green';
    if (consoleStatusBadge) {
      consoleStatusBadge.className = 'badge badge-online';
      consoleStatusBadge.textContent = status.isDetached ? `Detached (PID: ${status.pid})` : `Online (PID: ${status.pid})`;
    }

    if (status.isDetached) {
      dashServerStatus.textContent = `Running (Independent Window - PID: ${status.pid})`;
      if (detachedModeNotice) {
        detachedModeNotice.classList.remove('hidden');
        detachedModeNotice.innerHTML = `<span>💡</span><span><strong>Detached Mode Running:</strong> Hytale Server is active in an independent terminal window (PID: ${status.pid}). You can safely close or exit the Manager anytime without stopping your server!</span>`;
      }
      consoleInput.placeholder = 'Server is running in external console window. Use its terminal window for commands.';
      consoleInput.disabled = true;
    } else {
      dashServerStatus.textContent = `Running (PID: ${status.pid})`;
      if (detachedModeNotice) detachedModeNotice.classList.add('hidden');
      consoleInput.placeholder = 'Type a server command (e.g. help, list, stop)...';
      consoleInput.disabled = false;
    }
  } else {
    sidebarServerBadge.className = 'badge badge-offline';
    sidebarServerBadge.textContent = 'Server Offline';
    quickServerBtn.textContent = '▶ Start Server';
    quickServerBtn.className = 'btn btn-primary btn-sm';
    dashServerStatus.textContent = 'Stopped';
    if (consoleStatusDot) consoleStatusDot.className = 'console-dot dot-gray';
    if (consoleStatusBadge) {
      consoleStatusBadge.className = 'badge badge-offline';
      consoleStatusBadge.textContent = 'Offline';
    }

    if (detachedModeNotice) {
      if (consoleLaunchMode?.value === 'detached') {
        detachedModeNotice.classList.remove('hidden');
        detachedModeNotice.innerHTML = `<span>ℹ️</span><span><strong>Detached Mode Selected:</strong> When you start the server, it will open in a separate native terminal window, allowing you to close or exit the Manager without stopping your server.</span>`;
      } else {
        detachedModeNotice.classList.add('hidden');
      }
    }
    consoleInput.placeholder = 'Type a server command (e.g. help, list, stop)...';
    consoleInput.disabled = false;
  }
}

quickServerBtn.addEventListener('click', async () => {
  const st = await window.api.getServerStatus();
  if (st.isRunning) {
    quickServerBtn.disabled = true;
    quickServerBtn.textContent = 'Stopping...';
    await window.api.stopServer();
    quickServerBtn.disabled = false;
    showToast('Server stopped', 'info');
  } else {
    quickServerBtn.disabled = true;
    quickServerBtn.textContent = 'Starting...';
    const mode = consoleLaunchMode?.value || appConfig?.launchMode || 'integrated';
    const maxRam = settingsMaxRam?.value || appConfig?.maxRam || '6G';
    const res = await window.api.startServer({ mode, maxRam });
    quickServerBtn.disabled = false;
    if (res.error) {
      showToast(`Failed to start: ${res.error}`, 'error');
    } else {
      if (mode === 'detached') {
        showToast('Server launched in independent terminal window!', 'success');
      } else {
        showToast('Server starting!', 'success');
        switchTab('console');
      }
    }
  }
  await refreshServerStatus();
});

if (consoleLaunchMode) {
  consoleLaunchMode.addEventListener('change', () => {
    const mode = consoleLaunchMode.value;
    if (settingsLaunchMode) settingsLaunchMode.value = mode;
    if (appConfig) appConfig.launchMode = mode;
    refreshServerStatus();
    window.api.saveConfig(appConfig);
  });
}

if (settingsLaunchMode) {
  settingsLaunchMode.addEventListener('change', () => {
    const mode = settingsLaunchMode.value;
    if (consoleLaunchMode) consoleLaunchMode.value = mode;
    if (appConfig) appConfig.launchMode = mode;
    refreshServerStatus();
  });
}

// Stream Server Logs
window.api.onServerLog((entry) => {
  const line = document.createElement('div');
  line.className = `console-line ${entry.type || ''}`;
  line.textContent = entry.text;
  consoleOutput.appendChild(line);

  if (consoleAutoScroll.checked) {
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }
});

window.api.onServerStatusChange((status) => {
  updateServerStatusUI(status);
});

consoleInputForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const cmd = consoleInput.value.trim();
  if (!cmd) return;

  commandHistory.push(cmd);
  historyIndex = commandHistory.length;
  consoleInput.value = '';

  try {
    window.api.sendCommand(cmd);
  } catch (err) {
    showToast(`Command error: ${err.message}`, 'error');
  }
});

consoleInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    if (historyIndex > 0) {
      historyIndex--;
      consoleInput.value = commandHistory[historyIndex] || '';
    }
  } else if (e.key === 'ArrowDown') {
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      consoleInput.value = commandHistory[historyIndex] || '';
    } else {
      historyIndex = commandHistory.length;
      consoleInput.value = '';
    }
  }
});

btnClearConsole.addEventListener('click', () => {
  consoleOutput.innerHTML = '';
});

// ==========================================
// SETTINGS
// ==========================================
btnBrowseServerDir.addEventListener('click', async () => {
  const chosen = await window.api.selectServerDir();
  if (chosen) {
    settingsServerDir.value = chosen;
    dashServerDir.textContent = chosen;
    showToast('Updated server directory', 'success');
    await checkServerVersion();
    await loadInstalledMods();
    await refreshAccountStatus();
  }
});

btnSaveSettings.addEventListener('click', async () => {
  const patchline = settingsPatchline.value;
  const cfApiKey = settingsCfApiKey.value.trim();
  const launchMode = settingsLaunchMode ? settingsLaunchMode.value : 'integrated';
  const maxRam = settingsMaxRam ? settingsMaxRam.value : '6G';
  const closeToTray = settingsCloseToTray ? settingsCloseToTray.checked : true;

  appConfig.patchline = patchline;
  appConfig.cfApiKey = cfApiKey;
  appConfig.launchMode = launchMode;
  appConfig.maxRam = maxRam;
  appConfig.closeToTray = closeToTray;

  if (consoleLaunchMode) consoleLaunchMode.value = launchMode;
  if (detachedModeNotice) detachedModeNotice.classList.toggle('hidden', launchMode !== 'detached');

  await window.api.saveConfig(appConfig);
  showToast('Settings saved successfully!', 'success');
  await checkServerVersion();
});

openServerFolderBtn.addEventListener('click', () => {
  if (appConfig?.serverDir) {
    window.api.openPath(appConfig.serverDir);
  }
});

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

// Start
init();
