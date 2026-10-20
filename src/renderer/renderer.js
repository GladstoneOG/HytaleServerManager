'use strict';

// ============================================================================
// DOM References
// ============================================================================
const $ = (id) => document.getElementById(id);

const appEl = $('app');
const navButtons = document.querySelectorAll('.nav-item[data-tab]');
const pages = document.querySelectorAll('.page');
const pageTitle = $('page-title');
const toastContainer = $('toast-container');

// Sidebar & Topbar
const navModsCount = $('nav-mods-count');
const sidebarAccount = $('sidebar-account');
const sidebarAccountAvatar = $('sidebar-account-avatar');
const sidebarAccountName = $('sidebar-account-name');
const sidebarAccountDot = $('sidebar-account-dot');
const sidebarAccountText = $('sidebar-account-text');
const topbarStatus = $('topbar-status');
const topbarStatusText = $('topbar-status-text');
const quickServerBtn = $('quick-server-btn');

// Overview
const serverNotInstalledBanner = $('server-not-installed-banner');
const btnChangeFolderDash = $('btn-change-folder-dash');
const btnOpenInstallWizardDash = $('btn-open-install-wizard-dash');
const heroDot = $('hero-dot');
const heroLabel = $('hero-label');
const heroSub = $('hero-sub');
const heroFolderBtn = $('hero-folder-btn');
const heroConsoleBtn = $('hero-console-btn');
const heroServerBtn = $('hero-server-btn');
const serverUpdateBanner = $('server-update-banner');
const targetVersionTag = $('target-version-tag');
const updateProgressContainer = $('update-progress-container');
const updateProgressFill = $('update-progress-fill');
const updateProgressText = $('update-progress-text');
const btnUpdateServerNow = $('btn-update-server-now');
const statTotalMods = $('stat-total-mods');
const statEnabledMods = $('stat-enabled-mods');
const statUpdatesMods = $('stat-updates-mods');
const statActiveProfiles = $('stat-active-profiles');
const btnCheckUpdates = $('btn-check-updates');
const dashInstalledVer = $('dash-installed-ver');
const dashUpstreamVer = $('dash-upstream-ver');
const dashActiveProfile = $('dash-active-profile');
const dashServerDir = $('dash-server-dir');
const dashAuthUserTitle = $('dash-auth-user-title');
const dashAuthBadge = $('dash-auth-status-badge');
const dashAuthDesc = $('dash-auth-desc');
const btnDashLoginHytale = $('btn-dash-login-hytale');

// Console
const consoleStatusBadge = $('console-status-badge');
const consoleLaunchMode = $('console-launch-mode');
const btnClearConsole = $('btn-clear-console');
const detachedModeNotice = $('detached-mode-notice');
const detachedModeText = $('detached-mode-text');
const consoleOutput = $('console-output');
const consoleJump = $('console-jump');
const consoleInputForm = $('console-input-form');
const consoleInput = $('console-input');

// Library
const modsSearchInput = $('mods-search-input');
const modsFilter = $('mods-filter');
const modsSourceFilter = $('mods-source-filter');
const modsSortSelect = $('mods-sort-select');
const btnUpdateAllMods = $('btn-update-all-mods');
const btnRefreshInstalledMods = $('btn-refresh-installed-mods');
const btnOpenModsFolder = $('btn-open-mods-folder');
const installedModsList = $('installed-mods-list');

// Multi-selection batch bar
const modsBatchBar = $('mods-batch-bar');
const modsSelectAll = $('mods-select-all');
const modsSelectedCount = $('mods-selected-count');
const btnBatchEnable = $('btn-batch-enable');
const btnBatchDisable = $('btn-batch-disable');
const btnBatchDelete = $('btn-batch-delete');
const btnBatchClear = $('btn-batch-clear');

// Browse (Unified CurseForge + Thunderstore)
const browseSource = $('browse-source');
const browseSearchInput = $('browse-search-input');
const btnToggleFilters = $('btn-toggle-filters');
const filtersBadge = $('filters-badge');
const browseSortSelect = $('browse-sort-select');
const browseAdvancedFilters = $('browse-advanced-filters');
const cfCategoriesChips = $('cf-categories-chips');
const btnClearCategories = $('btn-clear-categories');
const browseUpdatedFilter = $('browse-updated-filter');
const btnResetBrowseFilters = $('btn-reset-browse-filters');
const browseCf = $('browse-cf');
const cfResultsGrid = $('cf-results-grid');
const cfPrevPage = $('cf-prev-page');
const cfPageInfo = $('cf-page-info');
const cfNextPage = $('cf-next-page');
const browseTs = $('browse-ts');
const tsResultsGrid = $('ts-results-grid');

// Profiles
const btnImportProfile = $('btn-import-profile');
const btnCreateProfile = $('btn-create-profile');
const profilesList = $('profiles-list');

// Settings
const settingsServerDir = $('settings-server-dir');
const btnSettingsSetup = $('btn-settings-setup');
const btnBrowseServerDir = $('btn-browse-server-dir');
const settingsMaxRam = $('settings-max-ram');
const settingsLaunchMode = $('settings-launch-mode');
const settingsPatchline = $('settings-patchline');
const settingsCloseAction = $('settings-close-action');
const settingsLoginItem = $('settings-login-item');
const settingRowStartupBehavior = $('setting-row-startup-behavior');
const settingsStartupBehavior = $('settings-startup-behavior');
const settingsAutoStartServer = $('settings-auto-start-server');
const settingsAccountDesc = $('settings-account-desc');
const btnTriggerDeviceLogin = $('btn-trigger-device-login');
const settingsCfApiKey = $('settings-cf-api-key');

// Setup Wizard Modal
const installModal = $('install-modal');
const modalInstallCloseBtn = $('modal-install-close-btn');
const wizardJavaDot = $('wizard-java-dot');
const wizardJavaText = $('wizard-java-text');
const wizardTargetDir = $('wizard-target-dir');
const wizardBtnBrowseDir = $('wizard-btn-browse-dir');
const wizardLocalDetectedBadge = $('wizard-local-detected-badge');
const wizardZipFilePicker = $('wizard-zip-file-picker');
const wizardZipFileInput = $('wizard-zip-file-input');
const wizardBtnBrowseZip = $('wizard-btn-browse-zip');
const wizardServerName = $('wizard-server-name');
const wizardGameMode = $('wizard-game-mode');
const wizardPort = $('wizard-port');
const wizardMaxPlayers = $('wizard-max-players');
const wizardMotd = $('wizard-motd');
const wizardProgressWrap = $('wizard-progress-wrap');
const wizardProgressFill = $('wizard-progress-fill');
const wizardProgressText = $('wizard-progress-text');
const wizardBtnCancel = $('wizard-btn-cancel');
const wizardBtnStart = $('wizard-btn-start');

// Mod Details Modal
const modModal = $('mod-modal');
const modalModAvatar = $('modal-mod-avatar');
const modalModTitle = $('modal-mod-title');
const modalModMeta = $('modal-mod-meta');
const modalModContent = $('modal-mod-content');
const modalModFooter = $('modal-mod-footer');
const modalCloseBtn = $('modal-close-btn');

// Sign-in Modal
const loginModal = $('login-modal');
const loginUserCode = $('login-user-code');
const btnCopyCode = $('btn-copy-code');
const btnOpenVerifyUrl = $('btn-open-verify-url');
const btnCancelLogin = $('btn-cancel-login');

// Generic Dialog Modal
const dialogModal = $('dialog-modal');
const dialogTitle = $('dialog-title');
const dialogMessage = $('dialog-message');
const dialogFields = $('dialog-fields');
const dialogCancel = $('dialog-cancel');
const dialogConfirm = $('dialog-confirm');

// ============================================================================
// Application State
// ============================================================================
let appConfig = null;
let currentTab = 'overview';
let currentInstalledMods = [];
let currentModsFilter = 'all';
let currentModsSourceFilter = 'all';
let currentModsSort = 'name-asc';
const selectedModFiles = new Set();

let currentBrowseSource = 'curseforge';
let cfPageIndex = 0;
const CF_PAGE_SIZE = 18;
let cfLoadedOnce = false;
let tsLoadedOnce = false;
let rawBrowseModsCache = [];
const selectedBrowseCategories = new Set();
let browseCategoriesList = [];

let activeDeviceAuth = null;
let commandHistory = [];
let historyIndex = -1;
let lastServerStatus = { isRunning: false, isDetached: false, pid: null };

// ============================================================================
// Utilities & Dialogs
// ============================================================================
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
  return String(num || 0);
}

function debounce(fn, ms = 260) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconId = type === 'success' ? 'i-check' : type === 'error' ? 'i-alert' : 'i-info';
  toast.innerHTML = `<svg class="ic"><use href="#${iconId}"/></svg><span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(4px)';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogFields.innerHTML = '';
    dialogConfirm.textContent = confirmLabel;
    dialogConfirm.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    dialogModal.classList.remove('hidden');

    const cleanup = (result) => {
      dialogModal.classList.add('hidden');
      dialogConfirm.removeEventListener('click', onConfirm);
      dialogCancel.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);

    dialogConfirm.addEventListener('click', onConfirm);
    dialogCancel.addEventListener('click', onCancel);
    dialogConfirm.focus();
  });
}

function promptDialog({ title, message = '', fields = [], confirmLabel = 'Save' }) {
  return new Promise((resolve) => {
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogMessage.classList.toggle('hidden', !message);
    dialogFields.innerHTML = fields
      .map(
        (f) => `
        <label class="field">
          <span class="field-label">${escapeHtml(f.label)}</span>
          <input type="text" class="input" data-field="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder || '')}" value="${escapeHtml(f.value || '')}">
        </label>`
      )
      .join('');
    dialogConfirm.textContent = confirmLabel;
    dialogConfirm.className = 'btn btn-primary';
    dialogModal.classList.remove('hidden');

    const firstInput = dialogFields.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 20);

    const cleanup = (result) => {
      dialogModal.classList.add('hidden');
      dialogMessage.classList.remove('hidden');
      dialogConfirm.removeEventListener('click', onConfirm);
      dialogCancel.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onConfirm = () => {
      const values = {};
      dialogFields.querySelectorAll('input[data-field]').forEach((inp) => {
        values[inp.dataset.field] = inp.value.trim();
      });
      cleanup(values);
    };
    const onCancel = () => cleanup(null);

    dialogConfirm.addEventListener('click', onConfirm);
    dialogCancel.addEventListener('click', onCancel);
  });
}

function setSegmentedValue(container, value) {
  if (!container) return;
  container.querySelectorAll('button[data-value]').forEach((btn) => {
    const active = btn.dataset.value === value;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

// ============================================================================
// Navigation & Shortcuts
// ============================================================================
const TAB_TITLES = {
  overview: 'Overview',
  console: 'Console',
  library: 'Library',
  browse: 'Browse Mods',
  profiles: 'Profiles',
  settings: 'Settings',
};

function switchTab(tabId) {
  if (!TAB_TITLES[tabId]) return;
  currentTab = tabId;
  appEl.dataset.activeTab = tabId;

  navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  pages.forEach((pane) => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });
  pageTitle.textContent = TAB_TITLES[tabId];

  // FIX 2: Hide duplicate topbar Start/Stop button on Overview tab
  if (quickServerBtn) {
    const isOverview = tabId === 'overview';
    quickServerBtn.classList.toggle('is-overview-hidden', isOverview);
  }

  if (tabId === 'library') {
    loadInstalledMods(true); // Auto-check for updates every time library is opened
  } else if (tabId === 'browse') {
    if (currentBrowseSource === 'curseforge' && !cfLoadedOnce) loadCurseForgeMods();
    if (currentBrowseSource === 'thunderstore' && !tsLoadedOnce) loadThunderstoreMods();
  } else if (tabId === 'profiles') {
    loadProfiles();
  } else if (tabId === 'console') {
    scrollToConsoleBottom();
    consoleInput.focus();
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Overview stat cards jump to target views
document.querySelectorAll('.stat[data-goto]').forEach((statBtn) => {
  statBtn.addEventListener('click', () => {
    const target = statBtn.dataset.goto;
    const filter = statBtn.dataset.filter;
    if (filter) {
      currentModsFilter = filter;
      setSegmentedValue(modsFilter, filter);
      renderInstalledModsList();
    }
    switchTab(target);
  });
});

heroConsoleBtn.addEventListener('click', () => switchTab('console'));

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    [modModal, installModal].forEach((m) => m.classList.add('hidden'));
    if (!dialogModal.classList.contains('hidden')) dialogCancel.click();
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    const map = { '1': 'overview', '2': 'console', '3': 'library', '4': 'browse', '5': 'profiles', ',': 'settings' };
    if (map[e.key]) {
      e.preventDefault();
      switchTab(map[e.key]);
    }
    return;
  }

  // '/' focuses the search input on the active page
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    const activePage = document.querySelector('.page.active');
    const searchInput = activePage?.querySelector('[data-page-search]');
    if (searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  }
});

// ============================================================================
// Initialization
// ============================================================================
async function init() {
  try {
    appConfig = await window.api.getConfig();
    applyConfigToUI();

    const loginItemInfo = await window.api.getLoginItem();
    settingsLoginItem.checked = Boolean(loginItemInfo?.openAtLogin);
    settingRowStartupBehavior?.classList.toggle('hidden', !settingsLoginItem.checked);

    // Initial tab setup
    switchTab('overview');

    // Load existing console log history
    const logs = await window.api.getServerLogs();
    if (Array.isArray(logs) && logs.length > 0) {
      consoleOutput.innerHTML = '';
      logs.forEach((entry) => queueLogLine(entry));
    }

    // Parallel non-blocking initial data loads
    await Promise.all([
      refreshServerStatus(),
      refreshAccountStatus(),
      checkServerVersion(),
      loadInstalledMods(true),
      loadProfilesCount(),
      loadCfCategories(),
    ]);
  } catch (e) {
    showToast(`Initialization failed: ${e.message}`, 'error');
  }
}

function applyConfigToUI() {
  if (!appConfig) return;
  const dir = appConfig.serverDir || '—';
  dashServerDir.textContent = dir;
  dashServerDir.title = dir;
  settingsServerDir.textContent = dir;

  if (appConfig.patchline) settingsPatchline.value = appConfig.patchline;
  if (appConfig.maxRam) settingsMaxRam.value = appConfig.maxRam;
  if (appConfig.cfApiKey) settingsCfApiKey.value = appConfig.cfApiKey;

  // Window close action (tray vs exit)
  const closeAction = appConfig.closeToTray === false ? 'exit' : 'tray';
  setSegmentedValue(settingsCloseAction, closeAction);

  // Startup appearance
  const startupBehavior = appConfig.startupBehavior === 'window' ? 'window' : 'tray';
  setSegmentedValue(settingsStartupBehavior, startupBehavior);

  // Auto-start server
  if (settingsAutoStartServer) {
    settingsAutoStartServer.checked = Boolean(appConfig.autoStartServer);
  }

  const mode = appConfig.launchMode || 'integrated';
  setSegmentedValue(consoleLaunchMode, mode);
  setSegmentedValue(settingsLaunchMode, mode);
}

async function saveConfigPatch(patch) {
  appConfig = { ...(appConfig || {}), ...patch };
  await window.api.saveConfig(appConfig);
  applyConfigToUI();
}

// ============================================================================
// Hytale Account & Device Code Sign-In (Display Account Name)
// ============================================================================
async function refreshAccountStatus() {
  try {
    const status = await window.api.getHytaleStatus();

    if (status.authenticated && !status.isExpired) {
      sidebarAccountDot.className = 'dot dot-ok';
      const displayName = status.username || (status.email ? status.email.split('@')[0] : 'Player');

      sidebarAccountName.textContent = displayName;
      sidebarAccountText.textContent = `Connected as ${displayName}`;
      sidebarAccount.title = `Connected as ${displayName}`;
      sidebarAccountAvatar.textContent = displayName.charAt(0).toUpperCase();

      dashAuthUserTitle.textContent = displayName;
      dashAuthBadge.className = 'tag tag-success';
      dashAuthBadge.textContent = 'Connected';
      dashAuthDesc.textContent = `Connected as ${displayName}`;
      btnDashLoginHytale.querySelector('span').textContent = 'Reconnect';

      settingsAccountDesc.textContent = `Connected as ${displayName}`;
      btnTriggerDeviceLogin.textContent = 'Reconnect';
    } else if (status.authenticated && status.isExpired) {
      sidebarAccountDot.className = 'dot dot-warn';
      const displayName = status.username || 'Account';
      sidebarAccountName.textContent = displayName;
      sidebarAccountText.textContent = 'Session expired';
      sidebarAccountAvatar.textContent = '⚠';

      dashAuthUserTitle.textContent = displayName;
      dashAuthBadge.className = 'tag tag-warning';
      dashAuthBadge.textContent = 'Expired';
      dashAuthDesc.textContent = 'Session expired. Sign in again to refresh.';
      btnDashLoginHytale.querySelector('span').textContent = 'Sign in';

      settingsAccountDesc.textContent = 'Session expired. Sign in again to refresh.';
      btnTriggerDeviceLogin.textContent = 'Sign in';
    } else {
      sidebarAccountDot.className = 'dot dot-muted';
      sidebarAccountName.textContent = 'Hytale account';
      sidebarAccountText.textContent = 'Not connected';
      sidebarAccountAvatar.innerHTML = '<svg class="ic"><use href="#i-user"/></svg>';

      dashAuthUserTitle.textContent = 'Hytale account';
      dashAuthBadge.className = 'tag';
      dashAuthBadge.textContent = 'Not connected';
      dashAuthDesc.textContent = 'Sign in to download official server updates.';
      btnDashLoginHytale.querySelector('span').textContent = 'Sign in';

      settingsAccountDesc.textContent = 'Sign in to download official server updates.';
      btnTriggerDeviceLogin.textContent = 'Sign in';
    }
  } catch {
    sidebarAccountDot.className = 'dot dot-err';
    sidebarAccountText.textContent = 'Error';
  }
}

async function startHytaleDeviceLogin() {
  try {
    loginUserCode.textContent = '········';
    loginModal.classList.remove('hidden');

    activeDeviceAuth = await window.api.startDeviceLogin();
    loginUserCode.textContent = activeDeviceAuth.user_code || '—';

    const res = await window.api.pollDeviceLogin(activeDeviceAuth);
    loginModal.classList.add('hidden');

    if (res.success) {
      showToast('Signed in to Hytale', 'success');
      await refreshAccountStatus();
      await checkServerVersion();
    } else if (res.error && !String(res.error).toLowerCase().includes('cancel')) {
      showToast(`Sign-in failed: ${res.error}`, 'error');
    }
  } catch (e) {
    loginModal.classList.add('hidden');
    showToast(`Sign-in error: ${e.message}`, 'error');
  }
}

sidebarAccount.addEventListener('click', () => {
  startHytaleDeviceLogin();
});
btnDashLoginHytale.addEventListener('click', startHytaleDeviceLogin);
btnTriggerDeviceLogin.addEventListener('click', startHytaleDeviceLogin);

btnCopyCode.addEventListener('click', async () => {
  if (!activeDeviceAuth?.user_code) return;
  try {
    await navigator.clipboard.writeText(activeDeviceAuth.user_code);
    showToast('Code copied to clipboard', 'success');
  } catch {}
});

btnOpenVerifyUrl.addEventListener('click', () => {
  const url = activeDeviceAuth?.verification_uri_complete || activeDeviceAuth?.verification_uri;
  if (url) window.api.openExternal(url);
});

btnCancelLogin.addEventListener('click', async () => {
  await window.api.cancelLogin();
  loginModal.classList.add('hidden');
});

// ============================================================================
// Server Version & Updates
// ============================================================================
async function checkServerVersion() {
  try {
    dashInstalledVer.innerHTML = '<span class="skeleton-text"></span>';
    dashUpstreamVer.innerHTML = '<span class="skeleton-text"></span>';

    const res = await window.api.checkServerVersion(appConfig?.patchline || 'release');

    dashInstalledVer.textContent = res.installedVersion
      ? `v${res.installedVersion}`
      : res.installed
      ? 'Installed'
      : 'Not installed';

    serverNotInstalledBanner.classList.toggle('hidden', Boolean(res.installed));

    if (res.latestVersion) {
      dashUpstreamVer.textContent = `v${res.latestVersion}`;
    } else if (res.authRequired) {
      dashUpstreamVer.textContent = 'Sign in required';
    } else {
      dashUpstreamVer.textContent = '—';
    }

    if (res.installed && res.updateAvailable && res.latestVersion) {
      serverUpdateBanner.classList.remove('hidden');
      targetVersionTag.textContent = res.latestVersion;
      // FIX 3: Update button styled with crisp blue .btn-update
      btnUpdateServerNow.className = 'btn btn-update btn-sm';
    } else {
      serverUpdateBanner.classList.add('hidden');
    }
  } catch {
    dashInstalledVer.textContent = '—';
    dashUpstreamVer.textContent = '—';
  }
}

btnCheckUpdates.addEventListener('click', async () => {
  await checkServerVersion();
  showToast('Checked for server updates', 'info');
});

btnUpdateServerNow.addEventListener('click', async () => {
  const ok = await confirmDialog({
    title: 'Update server now?',
    message: 'Your existing server files will be backed up automatically before the new version is extracted.',
    confirmLabel: 'Update server',
  });
  if (!ok) return;

  btnUpdateServerNow.disabled = true;
  updateProgressContainer.classList.remove('hidden');
  updateProgressFill.style.width = '0%';
  updateProgressText.textContent = 'Starting update…';

  const unlisten = window.api.onServerUpdateProgress((p) => {
    if (p.total && p.done) {
      const pct = Math.min(100, Math.round((p.done / p.total) * 100));
      updateProgressFill.style.width = `${pct}%`;
    }
    if (p.message) updateProgressText.textContent = p.message;
  });

  try {
    const res = await window.api.performServerUpdate(appConfig?.patchline || 'release');
    if (res.success) {
      showToast(`Updated to v${res.newVersion}`, 'success');
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

// ============================================================================
// Server Setup Wizard
// ============================================================================
async function openInstallWizard() {
  installModal.classList.remove('hidden');
  wizardProgressWrap.classList.add('hidden');
  wizardProgressFill.style.width = '0%';
  wizardBtnStart.disabled = false;

  if (appConfig?.serverDir) {
    wizardTargetDir.value = appConfig.serverDir;
  }

  wizardJavaDot.className = 'dot dot-muted';
  wizardJavaText.textContent = 'Checking Java…';

  try {
    const javaInfo = await window.api.checkJava();
    if (javaInfo.installed) {
      wizardJavaDot.className = javaInfo.isJava25Recommended ? 'dot dot-ok' : 'dot dot-warn';
      wizardJavaText.textContent = javaInfo.isJava25Recommended
        ? `${javaInfo.version} detected`
        : `${javaInfo.version} detected (Java 25 recommended)`;
    } else {
      wizardJavaDot.className = 'dot dot-err';
      wizardJavaText.textContent = 'Java not found in PATH — install Java 25 (Adoptium Temurin) to run the server.';
    }
  } catch {
    wizardJavaText.textContent = 'Could not detect Java version.';
  }

  try {
    const local = await window.api.detectClientInstall();
    wizardLocalDetectedBadge.classList.toggle('hidden', !local.detected);
    const preferred = local.detected ? 'local_client' : 'download';
    const radio = document.querySelector(`input[name="wizard-source"][value="${preferred}"]`);
    if (radio) radio.checked = true;
    wizardZipFilePicker.classList.add('hidden');
  } catch {
    wizardLocalDetectedBadge.classList.add('hidden');
  }
}

document.querySelectorAll('input[name="wizard-source"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    wizardZipFilePicker.classList.toggle('hidden', e.target.value !== 'zip_file');
  });
});

wizardBtnBrowseDir.addEventListener('click', async () => {
  const chosen = await window.api.selectServerDir();
  if (chosen) wizardTargetDir.value = chosen;
});

wizardBtnBrowseZip.addEventListener('click', async () => {
  const zip = await window.api.selectZipFileDialog();
  if (zip) wizardZipFileInput.value = zip;
});

modalInstallCloseBtn.addEventListener('click', () => installModal.classList.add('hidden'));
wizardBtnCancel.addEventListener('click', () => {
  window.api.cancelServerInstall();
  installModal.classList.add('hidden');
});

btnOpenInstallWizardDash.addEventListener('click', openInstallWizard);
btnSettingsSetup.addEventListener('click', openInstallWizard);

wizardBtnStart.addEventListener('click', async () => {
  const targetDir = wizardTargetDir.value.trim();
  if (!targetDir) {
    showToast('Choose a target folder first', 'error');
    return;
  }

  const selectedSource = document.querySelector('input[name="wizard-source"]:checked')?.value || 'local_client';
  const zipPath = wizardZipFileInput.value.trim();

  if (selectedSource === 'zip_file' && !zipPath) {
    showToast('Select a server .zip archive', 'error');
    return;
  }

  wizardBtnStart.disabled = true;
  wizardProgressWrap.classList.remove('hidden');
  wizardProgressFill.style.width = '0%';
  wizardProgressText.textContent = 'Setting up server…';

  const unlisten = window.api.onInstallerProgress((p) => {
    if (p.total && p.done) {
      const pct = Math.min(100, Math.round((p.done / p.total) * 100));
      wizardProgressFill.style.width = `${pct}%`;
    }
    if (p.message) wizardProgressText.textContent = p.message;
  });

  try {
    const res = await window.api.initializeServer(targetDir, {
      source: selectedSource,
      zipPath,
      serverName: wizardServerName.value.trim() || 'My Hytale Server',
      motd: wizardMotd.value.trim() || 'Welcome to our Hytale server!',
      port: parseInt(wizardPort.value, 10) || 5520,
      maxPlayers: parseInt(wizardMaxPlayers.value, 10) || 20,
      gameMode: wizardGameMode.value,
    });

    if (res.success) {
      showToast('Server is ready', 'success');
      installModal.classList.add('hidden');
      appConfig.serverDir = targetDir;
      applyConfigToUI();
      await Promise.all([checkServerVersion(), loadInstalledMods(false), refreshAccountStatus()]);
    } else {
      showToast(`Setup failed: ${res.error}`, 'error');
      wizardBtnStart.disabled = false;
    }
  } catch (err) {
    showToast(`Setup error: ${err.message}`, 'error');
    wizardBtnStart.disabled = false;
  } finally {
    unlisten();
  }
});

// ============================================================================
// Installed Mods (Library: Thumbnails, Multi-Selection & Sorting)
// ============================================================================
async function loadInstalledMods(checkRemoteUpdates = true) {
  try {
    if (currentInstalledMods.length === 0) {
      installedModsList.innerHTML = `<div class="empty"><div class="empty-sub">Scanning mods…</div></div>`;
    }

    const mods = await window.api.getInstalledMods(checkRemoteUpdates);
    currentInstalledMods = mods || [];

    const total = currentInstalledMods.length;
    const enabled = currentInstalledMods.filter((m) => m.isEnabled).length;
    const disabled = total - enabled;
    const updates = currentInstalledMods.filter((m) => m.updateAvailable).length;

    statTotalMods.textContent = total;
    statEnabledMods.textContent = enabled;
    statUpdatesMods.textContent = updates;
    statUpdatesMods.closest('.stat')?.classList.toggle('has-updates', updates > 0);
    navModsCount.textContent = total;

    const counts = { all: total, enabled, disabled, updates };
    modsFilter.querySelectorAll('[data-count]').forEach((el) => {
      const k = el.dataset.count;
      el.textContent = counts[k] ? `${counts[k]}` : '';
    });

    if (updates > 0) {
      btnUpdateAllMods.classList.remove('hidden');
      btnUpdateAllMods.className = 'btn btn-update btn-sm';
      btnUpdateAllMods.querySelector('span').textContent = `Update all (${updates})`;
    } else {
      btnUpdateAllMods.classList.add('hidden');
    }

    renderInstalledModsList();
  } catch (e) {
    installedModsList.innerHTML = `<div class="empty"><div class="empty-title">Could not read mods</div><div class="empty-sub">${escapeHtml(e.message)}</div></div>`;
  }
}

function updateBatchBarState(filteredMods) {
  const count = selectedModFiles.size;
  if (count > 0) {
    modsBatchBar.classList.remove('hidden');
    modsSelectedCount.textContent = `${count} selected`;
    if (filteredMods && filteredMods.length > 0) {
      modsSelectAll.checked = filteredMods.every((m) => selectedModFiles.has(m.fileName));
    }
  } else {
    modsBatchBar.classList.add('hidden');
    modsSelectAll.checked = false;
  }
}

function renderInstalledModsList() {
  const query = modsSearchInput.value.trim().toLowerCase();

  // Filter by search, status, and source
  let filtered = currentInstalledMods.filter((m) => {
    if (query) {
      const nameMatch = (m.manifest?.name || '').toLowerCase().includes(query);
      const fileMatch = (m.fileName || '').toLowerCase().includes(query);
      const descMatch = (m.manifest?.description || '').toLowerCase().includes(query);
      if (!nameMatch && !fileMatch && !descMatch) return false;
    }
    if (currentModsFilter === 'enabled' && !m.isEnabled) return false;
    if (currentModsFilter === 'disabled' && m.isEnabled) return false;
    if (currentModsFilter === 'updates' && !m.updateAvailable) return false;

    if (currentModsSourceFilter !== 'all' && m.source !== currentModsSourceFilter) return false;

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (currentModsSort === 'name-asc') {
      return (a.manifest?.name || a.fileName).localeCompare(b.manifest?.name || b.fileName);
    }
    if (currentModsSort === 'name-desc') {
      return (b.manifest?.name || b.fileName).localeCompare(a.manifest?.name || a.fileName);
    }
    if (currentModsSort === 'updated-desc') {
      return (b.lastModified || 0) - (a.lastModified || 0);
    }
    if (currentModsSort === 'size-desc') {
      return (b.size || 0) - (a.size || 0);
    }
    return 0;
  });

  const isFiltering = query !== '' || currentModsSourceFilter !== 'all' || currentModsFilter !== 'all';
  navModsCount.textContent = isFiltering ? `${filtered.length}` : `${currentInstalledMods.length}`;

  updateBatchBarState(filtered);

  if (filtered.length === 0) {
    const emptyMsg =
      currentInstalledMods.length === 0
        ? 'No mods installed yet. Browse CurseForge or Thunderstore to add mods.'
        : 'No mods match your current filter parameters.';
    installedModsList.innerHTML = `
      <div class="empty">
        <div class="empty-title">${currentInstalledMods.length === 0 ? 'Your library is empty' : 'No matches'}</div>
        <div class="empty-sub">${escapeHtml(emptyMsg)}</div>
      </div>`;
    return;
  }

  installedModsList.innerHTML = '';
  const frag = document.createDocumentFragment();

  filtered.forEach((m) => {
    const row = document.createElement('div');
    row.className = `mod-row${m.isEnabled ? '' : ' is-disabled'}`;

    const sourceTag =
      m.source === 'curseforge'
        ? '<span class="tag tag-warning">CurseForge</span>'
        : m.source === 'thunderstore'
        ? '<span class="tag tag-info">Thunderstore</span>'
        : '<span class="tag">Local</span>';

    const updateTag = m.updateAvailable ? '<span class="tag tag-success">Update available</span>' : '';
    const authors = (m.manifest?.authors || []).map((a) => (typeof a === 'string' ? a : a.Name)).filter(Boolean).join(', ');

    // FIX 4: Mod thumbnail avatar
    const initial = (m.manifest?.name || m.fileName || 'M').charAt(0).toUpperCase();
    const avatarHtml = m.iconUrl
      ? `<img src="${escapeHtml(m.iconUrl)}" alt="" loading="lazy">`
      : escapeHtml(initial);

    const isSelected = selectedModFiles.has(m.fileName);

    row.innerHTML = `
      <div class="mod-select-wrap">
        <input type="checkbox" class="mod-select-cb" data-file="${escapeHtml(m.fileName)}" ${isSelected ? 'checked' : ''} title="Select mod">
      </div>
      <div class="mod-row-avatar">
        ${avatarHtml}
      </div>
      <label class="switch" title="${m.isEnabled ? 'Enabled' : 'Disabled'}">
        <input type="checkbox" class="mod-toggle-cb" ${m.isEnabled ? 'checked' : ''}>
        <span class="switch-track"></span>
      </label>
      <div class="mod-row-main">
        <div class="mod-row-head">
          <span class="mod-row-name">${escapeHtml(m.manifest?.name || m.fileName)}</span>
          <span class="mod-row-ver">v${escapeHtml(m.manifest?.version || '1.0.0')}</span>
          ${sourceTag}
          ${updateTag}
        </div>
        ${m.manifest?.description ? `<div class="mod-row-desc">${escapeHtml(m.manifest.description)}</div>` : ''}
        <div class="mod-row-meta">
          <span class="mono">${escapeHtml(m.fileName)}</span>
          <span>${Math.max(1, Math.round((m.size || 0) / 1024))} KB</span>
          ${m.lastModified ? `<span>Updated ${new Date(m.lastModified).toLocaleDateString()}</span>` : ''}
          ${authors ? `<span>by ${escapeHtml(authors)}</span>` : ''}
        </div>
      </div>
      <div class="mod-row-actions">
        ${
          m.updateAvailable
            ? `<button class="btn btn-update btn-sm btn-update-mod"><svg class="ic"><use href="#i-update"/></svg><span>Update</span></button>`
            : ''
        }
        <button class="icon-btn danger btn-delete-mod" title="Remove mod" aria-label="Remove mod">
          <svg class="ic"><use href="#i-trash"/></svg>
        </button>
      </div>
    `;

    // Selection checkbox
    row.querySelector('.mod-select-cb').addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedModFiles.add(m.fileName);
      } else {
        selectedModFiles.delete(m.fileName);
      }
      updateBatchBarState(filtered);
    });

    // Toggle mod
    row.querySelector('.mod-toggle-cb').addEventListener('change', async (e) => {
      const enable = e.target.checked;
      try {
        await window.api.setModEnabled(m.fileName, enable);
        await loadInstalledMods(false);
      } catch (err) {
        showToast(`Failed to toggle mod: ${err.message}`, 'error');
        e.target.checked = !enable;
      }
    });

    // Update single mod
    const updateBtn = row.querySelector('.btn-update-mod');
    if (updateBtn) {
      updateBtn.addEventListener('click', async () => {
        updateBtn.disabled = true;
        updateBtn.textContent = 'Updating…';
        try {
          const res = await window.api.updateMod(m);
          if (res.success) {
            showToast(`Updated ${m.manifest?.name || m.fileName}`, 'success');
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

    // Delete single mod
    row.querySelector('.btn-delete-mod').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: `Remove ${m.manifest?.name || m.fileName}?`,
        message: `This will delete ${m.fileName} from your server's mods folder.`,
        confirmLabel: 'Remove',
        danger: true,
      });
      if (!ok) return;
      try {
        await window.api.deleteMod(m.fileName, false);
        selectedModFiles.delete(m.fileName);
        showToast(`Removed ${m.manifest?.name || m.fileName}`, 'info');
        await loadInstalledMods(false);
      } catch (err) {
        showToast(`Remove failed: ${err.message}`, 'error');
      }
    });

    frag.appendChild(row);
  });

  installedModsList.appendChild(frag);
}

modsSearchInput.addEventListener('input', renderInstalledModsList);

modsFilter.querySelectorAll('button[data-value]').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentModsFilter = btn.dataset.value;
    setSegmentedValue(modsFilter, currentModsFilter);
    renderInstalledModsList();
  });
});

modsSourceFilter?.addEventListener('change', (e) => {
  currentModsSourceFilter = e.target.value;
  renderInstalledModsList();
});

modsSortSelect?.addEventListener('change', (e) => {
  currentModsSort = e.target.value;
  renderInstalledModsList();
});

// Select All checkbox
modsSelectAll.addEventListener('change', (e) => {
  const query = modsSearchInput.value.trim().toLowerCase();
  const filtered = currentInstalledMods.filter((m) => {
    if (query && !(m.manifest?.name || '').toLowerCase().includes(query)) return false;
    if (currentModsFilter === 'enabled' && !m.isEnabled) return false;
    if (currentModsFilter === 'disabled' && m.isEnabled) return false;
    if (currentModsFilter === 'updates' && !m.updateAvailable) return false;
    if (currentModsSourceFilter !== 'all' && m.source !== currentModsSourceFilter) return false;
    return true;
  });

  if (e.target.checked) {
    filtered.forEach((m) => selectedModFiles.add(m.fileName));
  } else {
    selectedModFiles.clear();
  }
  renderInstalledModsList();
});

btnBatchClear.addEventListener('click', () => {
  selectedModFiles.clear();
  renderInstalledModsList();
});

btnBatchEnable.addEventListener('click', async () => {
  const count = selectedModFiles.size;
  if (count === 0) return;
  for (const fn of selectedModFiles) {
    await window.api.setModEnabled(fn, true).catch(() => {});
  }
  showToast(`Enabled ${count} mod(s)`, 'success');
  selectedModFiles.clear();
  await loadInstalledMods(false);
});

btnBatchDisable.addEventListener('click', async () => {
  const count = selectedModFiles.size;
  if (count === 0) return;
  for (const fn of selectedModFiles) {
    await window.api.setModEnabled(fn, false).catch(() => {});
  }
  showToast(`Disabled ${count} mod(s)`, 'info');
  selectedModFiles.clear();
  await loadInstalledMods(false);
});

btnBatchDelete.addEventListener('click', async () => {
  const count = selectedModFiles.size;
  if (count === 0) return;
  const ok = await confirmDialog({
    title: `Delete ${count} selected mod(s)?`,
    message: 'This will permanently remove the selected mod jar files from your server.',
    confirmLabel: `Delete ${count} mods`,
    danger: true,
  });
  if (!ok) return;

  for (const fn of selectedModFiles) {
    await window.api.deleteMod(fn, false).catch(() => {});
  }
  showToast(`Deleted ${count} mod(s)`, 'info');
  selectedModFiles.clear();
  await loadInstalledMods(false);
});

btnRefreshInstalledMods.addEventListener('click', async () => {
  await loadInstalledMods(true);
  showToast('Library refreshed', 'info');
});

btnOpenModsFolder.addEventListener('click', () => {
  if (appConfig?.serverDir) window.api.openPath(`${appConfig.serverDir}\\mods`);
});

btnUpdateAllMods.addEventListener('click', async () => {
  const toUpdate = currentInstalledMods.filter((m) => m.updateAvailable);
  if (toUpdate.length === 0) return;

  btnUpdateAllMods.disabled = true;
  for (const m of toUpdate) {
    try {
      await window.api.updateMod(m);
    } catch (e) {
      showToast(`Failed ${m.manifest?.name}: ${e.message}`, 'error');
    }
  }
  btnUpdateAllMods.disabled = false;
  showToast(`Updated ${toUpdate.length} mod(s)`, 'success');
  await loadInstalledMods(true);
});

// ============================================================================
// Unified Browse (Advanced Filters & Sorting)
// ============================================================================
function setBrowseSource(source) {
  currentBrowseSource = source;
  setSegmentedValue(browseSource, source);

  const isCf = source === 'curseforge';
  browseCf.classList.toggle('hidden', !isCf);
  browseTs.classList.toggle('hidden', isCf);

  if (isCf) {
    if (!cfLoadedOnce) loadCurseForgeMods();
  } else {
    if (!tsLoadedOnce) loadThunderstoreMods();
  }
}

browseSource.querySelectorAll('button[data-value]').forEach((btn) => {
  btn.addEventListener('click', () => setBrowseSource(btn.dataset.value));
});

// Toggle Advanced Filters Panel
btnToggleFilters.addEventListener('click', () => {
  browseAdvancedFilters.classList.toggle('hidden');
});

btnClearCategories.addEventListener('click', () => {
  selectedBrowseCategories.clear();
  renderCategoryChips();
  updateFiltersBadge();
  applyBrowseFilters();
});

btnResetBrowseFilters.addEventListener('click', () => {
  selectedBrowseCategories.clear();
  browseUpdatedFilter.value = 'all';
  browseSortSelect.value = 'popular';
  renderCategoryChips();
  updateFiltersBadge();
  cfPageIndex = 0;
  if (currentBrowseSource === 'curseforge') {
    loadCurseForgeMods();
  } else {
    loadThunderstoreMods();
  }
});

function updateFiltersBadge() {
  let count = selectedBrowseCategories.size;
  if (browseUpdatedFilter.value !== 'all') count++;
  if (browseSortSelect.value !== 'popular') count++;

  if (count > 0) {
    filtersBadge.classList.remove('hidden');
    filtersBadge.textContent = count;
  } else {
    filtersBadge.classList.add('hidden');
  }
}

browseUpdatedFilter.addEventListener('change', () => {
  updateFiltersBadge();
  applyBrowseFilters();
});

browseSortSelect.addEventListener('change', () => {
  updateFiltersBadge();
  applyBrowseFilters();
});

const triggerBrowseSearch = debounce(() => {
  if (currentBrowseSource === 'curseforge') {
    cfPageIndex = 0;
    loadCurseForgeMods();
  } else {
    loadThunderstoreMods();
  }
}, 280);

browseSearchInput.addEventListener('input', triggerBrowseSearch);

async function loadCfCategories() {
  try {
    const cats = await window.api.getCfCategories();
    browseCategoriesList = cats || [];
    renderCategoryChips();
  } catch {}
}

function renderCategoryChips() {
  if (!cfCategoriesChips) return;
  cfCategoriesChips.innerHTML = '';
  browseCategoriesList.forEach((c) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    const isAct = selectedBrowseCategories.has(c.id);
    chip.className = `filter-chip${isAct ? ' active' : ''}`;
    chip.textContent = c.name;
    chip.addEventListener('click', () => {
      if (selectedBrowseCategories.has(c.id)) {
        selectedBrowseCategories.delete(c.id);
      } else {
        selectedBrowseCategories.add(c.id);
      }
      chip.classList.toggle('active', selectedBrowseCategories.has(c.id));
      updateFiltersBadge();
      applyBrowseFilters();
    });
    cfCategoriesChips.appendChild(chip);
  });
}

function renderSkeletonCards(container, count = 6) {
  container.innerHTML = Array.from({ length: count }, () => '<div class="skeleton-card"></div>').join('');
}

function getSortFieldForCurseForge(val) {
  switch (val) {
    case 'popular': return 2; // Popularity
    case 'downloads': return 5; // Total downloads
    case 'updated': return 3; // Recently updated
    case 'name': return 4; // Name
    default: return 2;
  }
}

let currentCfTotalCount = 0;
let currentCfMaxPages = 1;

async function loadCurseForgeMods() {
  try {
    renderSkeletonCards(cfResultsGrid, 6);

    const searchFilter = browseSearchInput.value.trim();
    const sortVal = browseSortSelect.value;
    const sortField = getSortFieldForCurseForge(sortVal);

    // If a single category is selected in multi-select, pass it to upstream API for indexing
    const catArray = Array.from(selectedBrowseCategories);
    const categoryId = catArray.length === 1 ? catArray[0] : null;

    const res = await window.api.searchCurseForge({
      searchFilter,
      sortField,
      categoryId,
      pageSize: CF_PAGE_SIZE,
      index: cfPageIndex * CF_PAGE_SIZE,
    });

    cfLoadedOnce = true;
    rawBrowseModsCache = res.data || [];
    currentCfTotalCount = res.pagination?.totalCount || 0;
    currentCfMaxPages = Math.max(1, Math.ceil(currentCfTotalCount / CF_PAGE_SIZE));

    applyBrowseFilters();
  } catch (e) {
    cfResultsGrid.innerHTML = `<div class="empty"><div class="empty-title">CurseForge unavailable</div><div class="empty-sub">${escapeHtml(e.message)}</div></div>`;
  }
}

function applyBrowseFilters() {
  if (currentBrowseSource === 'curseforge') {
    renderCurseForgeFilteredResults();
  } else {
    renderThunderstoreFilteredResults();
  }
}

function renderCurseForgeFilteredResults() {
  let mods = [...rawBrowseModsCache];

  // 1. Multi-category filtering: mod must have at least one of the selected categories (if any selected)
  if (selectedBrowseCategories.size > 0) {
    mods = mods.filter((mod) => {
      const modCatIds = (mod.categories || []).map((c) => c.id);
      return Array.from(selectedBrowseCategories).some((selectedId) => modCatIds.includes(selectedId));
    });
  }

  // 2. Last updated date filtering
  const updatedFilter = browseUpdatedFilter.value;
  if (updatedFilter !== 'all') {
    const now = Date.now();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const maxAgeMs = (daysMap[updatedFilter] || 365) * 86400000;
    mods = mods.filter((mod) => {
      const modTime = mod.dateModified ? new Date(mod.dateModified).getTime() : 0;
      return now - modTime <= maxAgeMs;
    });
  }

  // 3. Client sorting
  const sort = browseSortSelect.value;
  if (sort === 'downloads') {
    mods.sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0));
  } else if (sort === 'updated') {
    mods.sort((a, b) => new Date(b.dateModified || 0).getTime() - new Date(a.dateModified || 0).getTime());
  } else if (sort === 'name') {
    mods.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // FIX 3: Update page / results count accurately when filtered
  const hasClientFilters = selectedBrowseCategories.size > 0 || browseUpdatedFilter.value !== 'all';
  if (hasClientFilters) {
    cfPageInfo.textContent = `${mods.length} mod${mods.length === 1 ? '' : 's'}`;
    cfPrevPage.disabled = true;
    cfNextPage.disabled = true;
  } else {
    cfPageInfo.textContent = `Page ${cfPageIndex + 1} of ${currentCfMaxPages}`;
    cfPrevPage.disabled = cfPageIndex === 0;
    cfNextPage.disabled = cfPageIndex >= currentCfMaxPages - 1;
  }

  if (mods.length === 0) {
    cfResultsGrid.innerHTML = `
      <div class="empty">
        <div class="empty-title">No matching mods found</div>
        <div class="empty-sub">Try expanding your category or date filter parameters.</div>
      </div>`;
    return;
  }

  cfResultsGrid.innerHTML = '';
  const frag = document.createDocumentFragment();

  mods.forEach((mod) => {
    const card = document.createElement('div');
    card.className = 'mod-card is-clickable';

    const initial = (mod.name || 'M').charAt(0).toUpperCase();
    const avatarHtml = mod.logo?.thumbnailUrl
      ? `<img src="${escapeHtml(mod.logo.thumbnailUrl)}" alt="" loading="lazy">`
      : escapeHtml(initial);

    const authorName = (mod.authors || []).map((a) => a.name).join(', ') || 'Unknown';
    const downloads = formatNumber(mod.downloadCount);
    const latestFile = mod.latestFiles?.[0] || null;

    const installedMatch = currentInstalledMods.find(
      (m) => m.remoteId === mod.id || (m.manifest?.name || '').toLowerCase() === (mod.name || '').toLowerCase()
    );

    let btnLabel = 'Install';
    let btnClass = 'btn-primary';
    const canInstall = !installedMatch || installedMatch.updateAvailable;
    if (installedMatch) {
      // FIX 3: Update button styled with crisp blue .btn-update
      btnLabel = installedMatch.updateAvailable ? 'Update' : 'Installed';
      btnClass = installedMatch.updateAvailable ? 'btn-update' : 'btn-ghost';
    }

    card.innerHTML = `
      <div class="mod-card-head">
        <div class="mod-avatar">${avatarHtml}</div>
        <div class="mod-card-titles">
          <div class="mod-card-name" title="${escapeHtml(mod.name)}">${escapeHtml(mod.name)}</div>
          <div class="mod-card-by">by ${escapeHtml(authorName)}</div>
        </div>
      </div>
      <div class="mod-card-desc">${escapeHtml(mod.summary || 'No description provided.')}</div>
      <div class="mod-card-foot">
        <span class="mod-card-stat">
          <svg class="ic"><use href="#i-download"/></svg>
          <span>${downloads}</span>
        </span>
        <button class="btn ${btnClass} btn-sm btn-cf-install" ${canInstall ? '' : 'disabled'}>${btnLabel}</button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-cf-install')) return;
      openModModal(mod, latestFile);
    });

    const installBtn = card.querySelector('.btn-cf-install');
    if (installBtn && canInstall) {
      installBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!latestFile) {
          showToast('No downloadable file found for this mod', 'error');
          return;
        }
        installBtn.disabled = true;
        installBtn.textContent = 'Installing…';
        try {
          const r = await window.api.installCfMod(mod, latestFile, true);
          if (r.success) {
            showToast(`Installed ${mod.name}`, 'success');
            installBtn.textContent = 'Installed';
            installBtn.className = 'btn btn-ghost btn-sm';
            await loadInstalledMods(false);
          } else {
            showToast(`Install failed: ${r.error}`, 'error');
            installBtn.disabled = false;
            installBtn.textContent = btnLabel;
          }
        } catch (err) {
          showToast(`Install error: ${err.message}`, 'error');
          installBtn.disabled = false;
          installBtn.textContent = btnLabel;
        }
      });
    }

    frag.appendChild(card);
  });

  cfResultsGrid.appendChild(frag);
}

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

let rawThunderstoreModsCache = [];

async function loadThunderstoreMods() {
  try {
    renderSkeletonCards(tsResultsGrid, 6);

    const pkgs = await window.api.searchThunderstore({
      searchFilter: browseSearchInput.value.trim(),
      sort: browseSortSelect.value,
    });

    tsLoadedOnce = true;
    rawThunderstoreModsCache = pkgs || [];
    renderThunderstoreFilteredResults();
  } catch (e) {
    tsResultsGrid.innerHTML = `<div class="empty"><div class="empty-title">Thunderstore unavailable</div><div class="empty-sub">${escapeHtml(e.message)}</div></div>`;
  }
}

function renderThunderstoreFilteredResults() {
  let pkgs = [...rawThunderstoreModsCache];

  // Date filtering
  const updatedFilter = browseUpdatedFilter.value;
  if (updatedFilter !== 'all') {
    const now = Date.now();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const maxAgeMs = (daysMap[updatedFilter] || 365) * 86400000;
    pkgs = pkgs.filter((pkg) => {
      const pkgTime = pkg.date_modified ? new Date(pkg.date_modified).getTime() : 0;
      return now - pkgTime <= maxAgeMs;
    });
  }

  // Sort
  const sort = browseSortSelect.value;
  if (sort === 'downloads') {
    pkgs.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
  } else if (sort === 'updated') {
    pkgs.sort((a, b) => new Date(b.date_modified || 0).getTime() - new Date(a.date_modified || 0).getTime());
  } else if (sort === 'name') {
    pkgs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  if (pkgs.length === 0) {
    tsResultsGrid.innerHTML = `
      <div class="empty">
        <div class="empty-title">No Thunderstore packages found</div>
        <div class="empty-sub">No community packages matched your parameters.</div>
      </div>`;
    return;
  }

  tsResultsGrid.innerHTML = '';
  const frag = document.createDocumentFragment();

  pkgs.forEach((pkg) => {
    const card = document.createElement('div');
    card.className = 'mod-card';

    const initial = (pkg.name || 'T').charAt(0).toUpperCase();
    const avatarHtml = pkg.icon_url ? `<img src="${escapeHtml(pkg.icon_url)}" alt="" loading="lazy">` : escapeHtml(initial);
    const downloads = formatNumber(pkg.download_count);

    const isInstalled = currentInstalledMods.some(
      (m) =>
        m.remoteId === `${pkg.namespace}/${pkg.name}` ||
        (m.manifest?.name || '').toLowerCase() === (pkg.name || '').toLowerCase()
    );

    card.innerHTML = `
      <div class="mod-card-head">
        <div class="mod-avatar">${avatarHtml}</div>
        <div class="mod-card-titles">
          <div class="mod-card-name" title="${escapeHtml(pkg.name)}">${escapeHtml(pkg.name)}</div>
          <div class="mod-card-by">by ${escapeHtml(pkg.namespace)}</div>
        </div>
      </div>
      <div class="mod-card-desc">${escapeHtml(pkg.description || 'No description provided.')}</div>
      <div class="mod-card-foot">
        <span class="mod-card-stat">
          <svg class="ic"><use href="#i-download"/></svg>
          <span>${downloads}</span>
        </span>
        <button class="btn ${isInstalled ? 'btn-ghost' : 'btn-primary'} btn-sm btn-ts-install" ${isInstalled ? 'disabled' : ''}>
          ${isInstalled ? 'Installed' : 'Install'}
        </button>
      </div>
    `;

    const installBtn = card.querySelector('.btn-ts-install');
    if (installBtn && !isInstalled) {
      installBtn.addEventListener('click', async () => {
        installBtn.disabled = true;
        installBtn.textContent = 'Installing…';
        try {
          const res = await window.api.installThunderstore(pkg);
          if (res.success) {
            showToast(`Installed ${pkg.name}`, 'success');
            installBtn.textContent = 'Installed';
            installBtn.className = 'btn btn-ghost btn-sm';
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

    frag.appendChild(card);
  });

  tsResultsGrid.appendChild(frag);
}

// ============================================================================
// Mod Details Modal
// ============================================================================
async function openModModal(mod, latestFile) {
  modalModTitle.textContent = mod.name;
  const authorName = (mod.authors || []).map((a) => a.name).join(', ') || 'Unknown';
  modalModMeta.textContent = `by ${authorName} · ${formatNumber(mod.downloadCount)} downloads`;
  modalModAvatar.innerHTML = mod.logo?.thumbnailUrl
    ? `<img src="${escapeHtml(mod.logo.thumbnailUrl)}" alt="">`
    : escapeHtml((mod.name || 'M').charAt(0).toUpperCase());

  modalModContent.innerHTML = '<div class="empty"><div class="empty-sub">Loading description…</div></div>';
  modModal.classList.remove('hidden');

  modalModFooter.innerHTML = `
    <button class="btn btn-ghost" id="modal-close-action">Close</button>
    <button class="btn btn-primary" id="modal-install-action" ${latestFile ? '' : 'disabled'}>Install</button>
  `;

  $('modal-close-action').addEventListener('click', () => modModal.classList.add('hidden'));
  $('modal-install-action').addEventListener('click', async (e) => {
    if (!latestFile) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Installing…';
    try {
      const res = await window.api.installCfMod(mod, latestFile, true);
      if (res.success) {
        showToast(`Installed ${mod.name}`, 'success');
        modModal.classList.add('hidden');
        await loadInstalledMods(false);
        if (currentBrowseSource === 'curseforge') loadCurseForgeMods();
      } else {
        showToast(`Install failed: ${res.error}`, 'error');
        btn.disabled = false;
        btn.textContent = 'Install';
      }
    } catch (err) {
      showToast(`Install error: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = 'Install';
    }
  });

  try {
    const desc = await window.api.getCfDescription(mod.id);
    modalModContent.innerHTML = desc || escapeHtml(mod.summary || 'No description available.');
  } catch {
    modalModContent.textContent = mod.summary || 'Could not load description.';
  }
}

modalCloseBtn.addEventListener('click', () => modModal.classList.add('hidden'));

[modModal, installModal].forEach((m) => {
  m.addEventListener('click', (e) => {
    if (e.target === m) m.classList.add('hidden');
  });
});

// ============================================================================
// Profiles
// ============================================================================
async function loadProfilesCount() {
  try {
    const profiles = await window.api.getProfiles();
    statActiveProfiles.textContent = (profiles || []).length;
    const active = (profiles || []).find((p) => p.active);
    if (active) dashActiveProfile.textContent = active.name;
  } catch {}
}

async function loadProfiles() {
  try {
    const profiles = await window.api.getProfiles();
    statActiveProfiles.textContent = (profiles || []).length;

    if (!profiles || profiles.length === 0) {
      profilesList.innerHTML = `
        <div class="empty">
          <div class="empty-title">No profiles saved yet</div>
          <div class="empty-sub">Create a profile to snapshot your current mod configuration.</div>
        </div>`;
      return;
    }

    profilesList.innerHTML = '';
    profiles.forEach((p) => {
      if (p.active) dashActiveProfile.textContent = p.name;

      const card = document.createElement('div');
      card.className = 'mod-card';
      card.innerHTML = `
        <div class="mod-card-head">
          <div class="mod-card-titles">
            <div class="mod-card-name">${escapeHtml(p.name)}</div>
            <div class="mod-card-by">${p.modCount || 0} mod(s)</div>
          </div>
          ${p.active ? '<span class="tag tag-success">Active</span>' : ''}
        </div>
        <div class="mod-card-desc">${escapeHtml(p.description || 'Saved mod profile snapshot.')}</div>
        <div class="mod-card-foot">
          <button class="btn btn-ghost btn-sm btn-export-profile">Export</button>
          <button class="btn ${p.active ? 'btn-ghost' : 'btn-primary'} btn-sm btn-activate-profile" ${p.active ? 'disabled' : ''}>
            ${p.active ? 'Active' : 'Switch to profile'}
          </button>
        </div>
      `;

      card.querySelector('.btn-activate-profile').addEventListener('click', async () => {
        try {
          await window.api.activateProfile(p.name);
          dashActiveProfile.textContent = p.name;
          showToast(`Switched to ${p.name}`, 'success');
          await Promise.all([loadProfiles(), loadInstalledMods(false)]);
        } catch (e) {
          showToast(`Failed to switch profile: ${e.message}`, 'error');
        }
      });

      card.querySelector('.btn-export-profile').addEventListener('click', async () => {
        try {
          const res = await window.api.exportProfileDialog(p.name);
          if (res.success) showToast(`Exported to ${res.path}`, 'success');
        } catch (e) {
          showToast(`Export failed: ${e.message}`, 'error');
        }
      });

      profilesList.appendChild(card);
    });
  } catch (e) {
    profilesList.innerHTML = `<div class="empty"><div class="empty-title">Failed to load profiles</div><div class="empty-sub">${escapeHtml(e.message)}</div></div>`;
  }
}

btnCreateProfile.addEventListener('click', async () => {
  const res = await promptDialog({
    title: 'New profile',
    message: 'Snapshots your currently enabled and disabled mods.',
    fields: [
      { name: 'name', label: 'Name', placeholder: 'e.g. Vanilla+ Survival' },
      { name: 'desc', label: 'Description (optional)', placeholder: 'Short note about this setup' },
    ],
    confirmLabel: 'Create profile',
  });
  if (!res || !res.name) return;

  try {
    await window.api.createProfile(res.name, res.desc || '');
    showToast(`Created profile ${res.name}`, 'success');
    await loadProfiles();
  } catch (e) {
    showToast(`Failed to create profile: ${e.message}`, 'error');
  }
});

btnImportProfile.addEventListener('click', async () => {
  try {
    const res = await window.api.importProfileDialog();
    if (res.success) {
      showToast(`Imported ${res.profileName}`, 'success');
      await Promise.all([loadProfiles(), loadInstalledMods(false)]);
    }
  } catch (e) {
    showToast(`Import error: ${e.message}`, 'error');
  }
});

// ============================================================================
// Server Runner & Console (Green Start, Red Stop, No Overview Duplicate)
// ============================================================================
async function refreshServerStatus() {
  try {
    const st = await window.api.getServerStatus();
    updateServerStatusUI(st);
  } catch {}
}

function setToggleButtonsState(running, busyText = null) {
  [quickServerBtn, heroServerBtn].forEach((btn) => {
    if (!btn) return;
    if (busyText) {
      btn.disabled = true;
      btn.innerHTML = `<span>${escapeHtml(busyText)}</span>`;
      return;
    }
    btn.disabled = false;
    // FIX 3: Start button is green (.btn-start), Stop button is red (.btn-stop)
    if (running) {
      btn.className = `btn btn-stop ${btn === quickServerBtn ? 'btn-sm ' : ''}server-toggle`;
      btn.innerHTML = `<svg class="ic"><use href="#i-stop"/></svg><span>Stop</span>`;
    } else {
      btn.className = `btn btn-start ${btn === quickServerBtn ? 'btn-sm ' : ''}server-toggle`;
      btn.innerHTML = `<svg class="ic"><use href="#i-play"/></svg><span>Start</span>`;
    }
  });
}

function updateServerStatusUI(status) {
  lastServerStatus = status || { isRunning: false };
  const running = Boolean(status?.isRunning);
  const mode = appConfig?.launchMode || 'integrated';

  appEl.classList.toggle('is-running', running);
  topbarStatus.classList.toggle('is-online', running);
  topbarStatus.classList.toggle('is-offline', !running);
  heroDot.classList.toggle('is-online', running);

  setToggleButtonsState(running);

  if (running) {
    topbarStatusText.textContent = status.isDetached ? `Running · PID ${status.pid}` : 'Running';
    heroLabel.textContent = 'Online';
    heroSub.textContent = status.isDetached
      ? `Running in separate window (PID ${status.pid})`
      : `Running in app (PID ${status.pid})`;

    consoleStatusBadge.className = 'tag tag-success';
    consoleStatusBadge.textContent = status.isDetached ? `Separate window · PID ${status.pid}` : `Online · PID ${status.pid}`;

    if (status.isDetached) {
      detachedModeNotice.classList.remove('hidden');
      detachedModeText.textContent = `Server is running in its own window (PID ${status.pid}). You can quit this app at any time without stopping the server.`;
      consoleInput.placeholder = 'Commands are entered in the external server window';
      consoleInput.disabled = true;
    } else {
      detachedModeNotice.classList.add('hidden');
      consoleInput.placeholder = 'Type a command — try help or list';
      consoleInput.disabled = false;
    }
  } else {
    topbarStatusText.textContent = 'Stopped';
    heroLabel.textContent = 'Offline';
    heroSub.textContent = 'Server is not running';
    consoleStatusBadge.className = 'tag';
    consoleStatusBadge.textContent = 'Offline';

    if (mode === 'detached') {
      detachedModeNotice.classList.remove('hidden');
      detachedModeText.textContent = 'Separate window mode: starting the server opens an independent console window that stays alive if you close this app.';
    } else {
      detachedModeNotice.classList.add('hidden');
    }
    consoleInput.placeholder = 'Type a command — try help or list';
    consoleInput.disabled = false;
  }
}

async function toggleServer() {
  const st = await window.api.getServerStatus();
  if (st.isRunning) {
    setToggleButtonsState(true, 'Stopping…');
    await window.api.stopServer();
    showToast('Server stopped', 'info');
  } else {
    setToggleButtonsState(false, 'Starting…');
    const mode = appConfig?.launchMode || 'integrated';
    const maxRam = appConfig?.maxRam || '6G';
    const res = await window.api.startServer({ mode, maxRam });
    if (res.error) {
      showToast(`Could not start server: ${res.error}`, 'error');
    } else {
      showToast(mode === 'detached' ? 'Server launched in a separate window' : 'Server started', 'success');
      if (mode === 'integrated') switchTab('console');
    }
  }
  await refreshServerStatus();
}

quickServerBtn.addEventListener('click', toggleServer);
heroServerBtn.addEventListener('click', toggleServer);

// Batched log rendering for zero UI jank
const MAX_CONSOLE_LINES = 600;
let pendingLogLines = [];
let logFlushScheduled = false;
let stickToBottom = true;

function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 36;
}

function scrollToConsoleBottom() {
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
  stickToBottom = true;
  consoleJump.classList.add('hidden');
}

consoleOutput.addEventListener('scroll', () => {
  stickToBottom = isNearBottom(consoleOutput);
  consoleJump.classList.toggle('hidden', stickToBottom);
});

consoleJump.addEventListener('click', scrollToConsoleBottom);

function queueLogLine(entry) {
  pendingLogLines.push(entry);
  if (!logFlushScheduled) {
    logFlushScheduled = true;
    requestAnimationFrame(flushLogLines);
  }
}

function flushLogLines() {
  logFlushScheduled = false;
  if (pendingLogLines.length === 0) return;

  const frag = document.createDocumentFragment();
  for (const entry of pendingLogLines) {
    const line = document.createElement('div');
    line.className = `log-line ${entry.type || ''}`;
    line.textContent = entry.text;
    frag.appendChild(line);
  }
  pendingLogLines = [];
  consoleOutput.appendChild(frag);

  while (consoleOutput.childElementCount > MAX_CONSOLE_LINES) {
    consoleOutput.firstElementChild.remove();
  }

  if (stickToBottom) {
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }
}

window.api.onServerLog((entry) => queueLogLine(entry));
window.api.onServerStatusChange((status) => updateServerStatusUI(status));

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
  consoleJump.classList.add('hidden');
});

// ============================================================================
// Auto-Saving Settings & Folder Actions (Configurable Default Behaviors)
// ============================================================================
async function handleChooseServerFolder() {
  const chosen = await window.api.selectServerDir();
  if (!chosen) return;
  appConfig.serverDir = chosen;
  applyConfigToUI();
  showToast('Server folder updated', 'success');
  await Promise.all([checkServerVersion(), loadInstalledMods(true), refreshAccountStatus()]);
}

btnBrowseServerDir.addEventListener('click', handleChooseServerFolder);
btnChangeFolderDash.addEventListener('click', handleChooseServerFolder);

function openServerFolder() {
  if (appConfig?.serverDir) window.api.openPath(appConfig.serverDir);
}

heroFolderBtn.addEventListener('click', openServerFolder);
dashServerDir.addEventListener('click', openServerFolder);

function bindSegmentedControl(container, onSelect) {
  if (!container) return;
  container.querySelectorAll('button[data-value]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const val = btn.dataset.value;
      setSegmentedValue(container, val);
      await onSelect(val);
    });
  });
}

bindSegmentedControl(consoleLaunchMode, async (val) => {
  await saveConfigPatch({ launchMode: val });
  updateServerStatusUI(lastServerStatus);
});

bindSegmentedControl(settingsLaunchMode, async (val) => {
  await saveConfigPatch({ launchMode: val });
  updateServerStatusUI(lastServerStatus);
});

// FIX 6: Default behavior settings
bindSegmentedControl(settingsCloseAction, async (val) => {
  const closeToTray = val === 'tray';
  await saveConfigPatch({ closeToTray });
});

bindSegmentedControl(settingsStartupBehavior, async (val) => {
  await saveConfigPatch({ startupBehavior: val });
  const openAsHidden = val === 'tray';
  if (settingsLoginItem.checked) {
    await window.api.setLoginItem(true, openAsHidden);
  }
});

settingsLoginItem.addEventListener('change', async () => {
  const enabled = settingsLoginItem.checked;
  settingRowStartupBehavior?.classList.toggle('hidden', !enabled);
  const openAsHidden = (appConfig?.startupBehavior || 'tray') === 'tray';
  await window.api.setLoginItem(enabled, openAsHidden);
});

if (settingsAutoStartServer) {
  settingsAutoStartServer.addEventListener('change', async () => {
    await saveConfigPatch({ autoStartServer: settingsAutoStartServer.checked });
  });
}

settingsMaxRam.addEventListener('change', () => {
  saveConfigPatch({ maxRam: settingsMaxRam.value });
});

settingsPatchline.addEventListener('change', async () => {
  await saveConfigPatch({ patchline: settingsPatchline.value });
  await checkServerVersion();
});

const saveApiKeyDebounced = debounce(() => {
  saveConfigPatch({ cfApiKey: settingsCfApiKey.value.trim() });
}, 400);

settingsCfApiKey.addEventListener('input', saveApiKeyDebounced);

// Boot
init();
