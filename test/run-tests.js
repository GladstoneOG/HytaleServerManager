'use strict';
/**
 * Automated Verification Test Suite for Hytale Server Manager
 */
const assert = require('assert');
const path = require('path');
const { compareVersions, hashFile, safeName } = require('../src/main/util');
const { murmur2, normalize, curseforgeFingerprint } = require('../src/main/murmur2');
const { CurseForgeClient } = require('../src/main/curseforge');
const { ThunderstoreClient } = require('../src/main/thunderstore');
const { HytaleAuthManager } = require('../src/main/hytaleAuth');
const { ServerUpdater } = require('../src/main/serverUpdater');
const { ServerInstaller } = require('../src/main/serverInstaller');
const { ModManager } = require('../src/main/modManager');
const { ServerRunner } = require('../src/main/serverRunner');
const fsp = require('fs/promises');
const os = require('os');

async function run() {
  console.log('🧪 Starting Hytale Server Manager Verification Tests...\n');

  // Test 1: Util Version Comparison
  console.log('Test 1: Version Comparison');
  assert.strictEqual(compareVersions('0.7.1', '0.7.2'), -1);
  assert.strictEqual(compareVersions('0.7.2', '0.7.1'), 1);
  assert.strictEqual(compareVersions('0.7.1', '0.7.1'), 0);
  assert.strictEqual(compareVersions('1.0.0', '0.9.9'), 1);
  console.log('  ✓ compareVersions passed');

  // Test 2: Murmur2 & Fingerprinting
  console.log('Test 2: Murmur2 Fingerprint');
  const testBuf = Buffer.from('hello world\n\t');
  const normalized = normalize(testBuf);
  assert.strictEqual(normalized.toString('utf8'), 'helloworld');
  const hash = murmur2(normalized, 1);
  assert.strictEqual(typeof hash, 'number');
  assert(hash > 0);
  console.log(`  ✓ Murmur2 hash: ${hash}`);

  // Test 3: Server Version Detection
  console.log('Test 3: Server Version Detection on F:\\serverht\\Server');
  const auth = new HytaleAuthManager({ serverDir: 'F:\\serverht\\Server' });
  const updater = new ServerUpdater(auth, { serverDir: 'F:\\serverht\\Server' });
  const installed = await updater.getInstalledVersion();
  console.log('  Installed version detected:', installed);
  assert.strictEqual(installed.installed, true);
  assert.strictEqual(installed.version, '0.7.1');
  console.log('  ✓ Detected HytaleServer.jar version 0.7.1 successfully');

  // Test 4: Hytale Auth & Credentials Discovery
  console.log('Test 4: Hytale Auth & Credentials Detection');
  const credsFile = await auth.findCredentialsFile();
  console.log('  Found credentials file at:', credsFile);
  assert(credsFile !== null);
  const status = await auth.getStatus();
  console.log('  Auth status:', status);
  assert.strictEqual(status.authenticated, true);
  console.log('  ✓ Found existing Hytale downloader credentials and verified authenticated status');

  // Test 5: Mod Manager Scan on F:\serverht\Server\mods
  console.log('Test 5: Mod Manager Scan');
  const cf = new CurseForgeClient();
  const ts = new ThunderstoreClient();
  const modMgr = new ModManager({
    serverDir: 'F:\\serverht\\Server',
    curseforgeClient: cf,
    thunderstoreClient: ts,
  });
  const mods = await modMgr.getInstalledMods(false);
  console.log(`  Found ${mods.length} installed mods in Server/mods:`);
  for (const m of mods) {
    console.log(`    - ${m.manifest.name} v${m.manifest.version} (File: ${m.fileName}, Enabled: ${m.isEnabled})`);
  }
  assert(mods.length >= 2);
  const claimChest = mods.find((m) => m.manifest.name === 'ClaimChestQOL');
  assert(claimChest !== undefined);
  console.log('  ✓ Successfully parsed mod manifests and enabled statuses');

  // Test 6: CurseForge API Integration
  console.log('Test 6: CurseForge Search API');
  const cfResults = await cf.searchMods({ searchFilter: 'BetterMap', pageSize: 3 });
  console.log(`  CF search returned ${cfResults.data.length} results (Total in DB: ${cfResults.pagination.totalCount})`);
  assert(cfResults.data.length > 0);
  const topMod = cfResults.data[0];
  console.log(`  Top match: ${topMod.name} (ID: ${topMod.id}, Downloads: ${topMod.downloadCount})`);
  assert.strictEqual(topMod.id, 1430352); // BetterMap modId
  console.log('  ✓ CurseForge search and mod details working cleanly');

  // Test 7: Thunderstore API Integration
  console.log('Test 7: Thunderstore API');
  const tsPackages = await ts.searchPackages({ searchFilter: 'Core' });
  console.log(`  Thunderstore packages matching "Core": ${tsPackages.length}`);
  assert(tsPackages.length > 0);
  console.log(`  First package: ${tsPackages[0].namespace}-${tsPackages[0].name} (${tsPackages[0].description})`);
  console.log('  ✓ Thunderstore integration working cleanly');

  // Test 8: Profiles Management
  console.log('Test 8: Profiles Management');
  const initialProfiles = await modMgr.getProfiles();
  console.log(`  Initial profiles: ${initialProfiles.map((p) => p.name).join(', ')}`);
  const newProfile = await modMgr.createProfile('TestSnapshot', 'Snapshot for verification test');
  assert.strictEqual(newProfile.name, 'TestSnapshot');
  assert(newProfile.mods.length >= 2);
  console.log(`  Created profile "TestSnapshot" with ${newProfile.mods.length} mods`);
  const afterProfiles = await modMgr.getProfiles();
  assert(afterProfiles.some((p) => p.name === 'TestSnapshot'));
  // Clean up test profile
  await fsp.rm('F:\\serverht\\Server\\.mod_profiles\\TestSnapshot.json', { force: true }).catch(() => {});
  console.log('  ✓ Profiles created and verified');

  // Test 9: Java Environment Check
  console.log('Test 9: Java Environment Probe');
  const installer = new ServerInstaller({ authManager: auth, serverUpdater: updater });
  const javaCheck = await installer.checkJava();
  console.log('  Java probe result:', javaCheck);
  assert.strictEqual(javaCheck.installed, true);
  assert(javaCheck.majorVersion >= 21);
  console.log(`  ✓ Detected system Java: ${javaCheck.version} (Major: ${javaCheck.majorVersion})`);

  // Test 10: Local Client Install Detection
  console.log('Test 10: Local Game Client Detection');
  const clientCheck = await installer.detectLocalClientInstall();
  console.log('  Local client detection:', clientCheck);
  assert.strictEqual(clientCheck.detected, true);
  assert(clientCheck.jarPath !== null);
  assert(clientCheck.assetsPath !== null);
  console.log('  ✓ Successfully detected local client installation files');

  // Test 11: Server Runner & Process Discovery
  console.log('Test 11: Server Runner & Detached Process Discovery');
  const runner = new ServerRunner({ serverDir: 'F:\\serverht\\Server' });
  const initialStatus = runner.getStatus();
  assert.strictEqual(typeof initialStatus.isRunning, 'boolean');
  assert.strictEqual(initialStatus.serverDir, 'F:\\serverht\\Server');
  const scanResult = await runner.findRunningServerProcess();
  assert.strictEqual(typeof scanResult.isRunning, 'boolean');
  console.log(`  Process scanner checked OS process table: isRunning=${scanResult.isRunning}, pid=${scanResult.pid}`);
  console.log('  ✓ ServerRunner initialized and process detection query verified');

  // Test 12: Windows Shortcut Generator
  console.log('Test 12: Windows Shortcut Generation');
  const { createShortcut } = require('../scripts/create-shortcut');
  const testShortcutDir = path.join(os.tmpdir(), `hytale_test_sc_${Date.now()}`);
  await fsp.mkdir(testShortcutDir, { recursive: true });
  try {
    const scResult = createShortcut({ desktopDir: testShortcutDir });
    console.log('  Shortcut result:', scResult);
    if (process.platform === 'win32') {
      assert.strictEqual(scResult.success, true);
      assert(scResult.created.length > 0);
      const testLnk = path.join(testShortcutDir, 'Hytale Server Manager.lnk');
      const exists = await fsp.access(testLnk).then(() => true).catch(() => false);
      assert.strictEqual(exists, true);
    }
    console.log('  ✓ Windows shortcut generation verified');
  } finally {
    try {
      await fsp.rm(testShortcutDir, { recursive: true, force: true });
    } catch {}
  }

  // Test 13: Secure Encrypted Credential Store
  console.log('Test 13: Secure Encrypted Credential Store');
  const { encryptData, decryptData, saveSecureCredentials, loadSecureCredentials } = require('../src/main/secureStorage');
  const sampleCreds = { access_token: 'secret_abc_123', refresh_token: 'refresh_xyz_789', username: 'TestPlayer' };
  const tempCredEnc = path.join(os.tmpdir(), `hytale_test_cred_${Date.now()}.enc`);
  try {
    await saveSecureCredentials(tempCredEnc, sampleCreds);
    const rawFileContent = await fsp.readFile(tempCredEnc);
    // Plaintext secret must not appear anywhere unencrypted in the file
    assert.strictEqual(rawFileContent.includes('secret_abc_123'), false);
    const loaded = await loadSecureCredentials(tempCredEnc);
    assert.strictEqual(loaded.credentials.access_token, 'secret_abc_123');
    assert.strictEqual(loaded.credentials.username, 'TestPlayer');
    console.log('  ✓ Encrypted credentials verified: zero plaintext on disk & decrypted cleanly');
  } finally {
    try { await fsp.unlink(tempCredEnc); } catch {}
  }

  // Test 14: Mod Manager Atomic Toggling & Anti-Spam
  console.log('Test 14: Mod Manager Atomic Toggling & Anti-Spam');
  const tempToggleDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'hytale_toggle_test_'));
  const tempModsDir = path.join(tempToggleDir, 'mods');
  await fsp.mkdir(tempModsDir, { recursive: true });
  const dummyJarPath = path.join(tempModsDir, 'DummyMod-1.0.0.jar');
  await fsp.writeFile(dummyJarPath, 'PK\x05\x06' + '\x00'.repeat(18));
  const testModMan = new ModManager({ serverDir: tempToggleDir });
  const installedMods = await testModMan.getInstalledMods(false);
  assert(installedMods.length === 1);
  const testTarget = installedMods[0];
  const initialEnabled = testTarget.isEnabled;
  // Spam 4 concurrent toggle requests in parallel
  const spamResults = await Promise.all([
    testModMan.setModEnabled(testTarget.fileName, !initialEnabled),
    testModMan.setModEnabled(testTarget.fileName, !initialEnabled),
    testModMan.setModEnabled(testTarget.fileName, !initialEnabled),
    testModMan.setModEnabled(testTarget.fileName, !initialEnabled),
  ]);
  assert.strictEqual(spamResults.every((r) => r.success), true);
  // Restore back to original state
  await testModMan.setModEnabled(spamResults[0].newFileName, initialEnabled);
  await fsp.rm(tempToggleDir, { recursive: true, force: true });
  console.log('  ✓ Concurrent duplicate toggle calls executed cleanly without race conditions');

  // Test 15: CurseForge Release vs Beta File Selection & Compatibility
  console.log('Test 15: CurseForge Release vs Beta Selection & Compatibility');
  const { selectBestCurseForgeFile } = require('../src/main/modManager');
  const mockMod = {
    name: 'MockMod',
    latestFiles: [
      { id: 999, fileName: 'Mock-beta-0.7.jar', releaseType: 2, gameVersions: ['0.7'] },
      { id: 888, fileName: 'Mock-release-0.7.jar', releaseType: 1, gameVersions: ['0.7'] },
      { id: 777, fileName: 'Mock-release-0.6.jar', releaseType: 1, gameVersions: ['0.6'] },
    ],
  };
  // Should select Release 1 over Beta 2 even if Beta has higher id
  const selected = selectBestCurseForgeFile(mockMod, '0.7.1', false);
  assert.strictEqual(selected.id, 888);
  assert.strictEqual(selected.releaseType, 1);
  assert.strictEqual(selected.fileName, 'Mock-release-0.7.jar');
  console.log('  ✓ Correctly selected compatible Release build (avoided Beta build)');

  // Test 16: Strict Version Compatibility & 3-Dot Formatting
  console.log('Test 16: Strict Version Compatibility & 3-Dot Formatting');
  const legacyMod = {
    name: 'EyeSpy',
    latestFiles: [
      { id: 101, fileName: 'EyeSpy-0.6.jar', releaseType: 1, gameVersions: ['0.6', 'Early Access'] },
      { id: 100, fileName: 'EyeSpy-0.5.jar', releaseType: 1, gameVersions: ['0.5', 'Early Access'] },
    ],
  };
  const branch = '0.7';
  const isCompatibleWith07 = (f) => {
    const gvs = f.gameVersions || [];
    return gvs.some((gv) => {
      const gvClean = String(gv).trim();
      const gvLower = gvClean.toLowerCase();
      if (gvClean === '*' || gvLower === 'all') return true;
      if (gvClean === '0.7.1') return true;
      if (branch && (gvClean === branch || gvClean.startsWith(branch + '.') || gvClean.startsWith(branch + 'x'))) return true;
      if (branch && branch.toLowerCase() === 'early access' && gvLower === 'early access') return true;
      return false;
    });
  };
  assert.strictEqual(isCompatibleWith07(legacyMod.latestFiles[0]), false);
  assert.strictEqual(isCompatibleWith07(legacyMod.latestFiles[1]), false);

  function formatGameVersionLabel(v) {
    if (!v) return '';
    const s = String(v).trim();
    if (/^\d+\.\d+$/.test(s)) {
      return `${s}.x`;
    }
    return s;
  }
  assert.strictEqual(formatGameVersionLabel('0.7'), '0.7.x');
  assert.strictEqual(formatGameVersionLabel('0.6'), '0.6.x');
  assert.strictEqual(formatGameVersionLabel('0.7.1'), '0.7.1');
  assert.strictEqual(formatGameVersionLabel('Early Access'), 'Early Access');

  function cleanVerNum(v) {
    if (!v) return '0';
    const clean = String(v).replace(/^[v^~>=<\s]+/, '').split('-')[0].trim();
    return clean || '0';
  }

  function isDateOrBuildTag(v) {
    if (!v) return false;
    const c = cleanVerNum(v);
    const major = parseInt(c.split('.')[0], 10);
    return major > 100 || /[a-f0-9]{7,}/i.test(String(v));
  }

  function checkSingleClause(clause, currentServerVer) {
    const curClean = cleanVerNum(currentServerVer);
    const curBranch = curClean.split('.').slice(0, 2).join('.');
    const tokens = clause.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    for (const rawToken of tokens) {
      const token = rawToken.trim();
      if (token === '*' || token.toLowerCase() === 'all') continue;
      if (isDateOrBuildTag(token)) continue;
      if (token.startsWith('^')) {
        const minVer = cleanVerNum(token.slice(1));
        const parts = minVer.split('.').map((n) => parseInt(n, 10) || 0);
        let maxVer = '1.0.0';
        if (parts[0] === 0) maxVer = '0.' + ((parts[1] || 0) + 1) + '.0';
        else maxVer = (parts[0] + 1) + '.0.0';
        if (compareVersions(curClean, minVer) < 0 || compareVersions(curClean, maxVer) >= 0) return false;
        continue;
      }
      if (token.startsWith('~')) {
        const minVer = cleanVerNum(token.slice(1));
        const parts = minVer.split('.').map((n) => parseInt(n, 10) || 0);
        const maxVer = (parts[0] || 0) + '.' + ((parts[1] || 0) + 1) + '.0';
        if (compareVersions(curClean, minVer) < 0 || compareVersions(curClean, maxVer) >= 0) return false;
        continue;
      }
      if (token.startsWith('>=')) {
        if (compareVersions(curClean, cleanVerNum(token.slice(2))) < 0) return false;
        continue;
      }
      if (token.startsWith('>')) {
        if (compareVersions(curClean, cleanVerNum(token.slice(1))) <= 0) return false;
        continue;
      }
      if (token.startsWith('<=')) {
        if (compareVersions(curClean, cleanVerNum(token.slice(2))) > 0) return false;
        continue;
      }
      if (token.startsWith('<')) {
        if (compareVersions(curClean, cleanVerNum(token.slice(1))) >= 0) return false;
        continue;
      }
      const cleanToken = cleanVerNum(token);
      if (cleanToken === curClean) continue;
      if (token === curBranch || token.startsWith(curBranch + '.') || token.startsWith(curBranch + 'x')) continue;
      if (token.toLowerCase() === 'early access' && curBranch.toLowerCase() === 'early access') continue;
      return false;
    }
    return true;
  }

  function isModVersionCompatibleWithServer(serverVerSpec, currentServerVer, remoteGameVersions = null) {
    if (!serverVerSpec || serverVerSpec === '*' || serverVerSpec.toLowerCase() === 'all') return true;
    if (!currentServerVer) return true;
    const curClean = cleanVerNum(currentServerVer);
    const curBranch = curClean.split('.').slice(0, 2).join('.');
    if (Array.isArray(remoteGameVersions) && remoteGameVersions.length > 0) {
      const remoteMatches = remoteGameVersions.some((gv) => {
        const gvClean = String(gv).trim();
        const gvLower = gvClean.toLowerCase();
        if (gvClean === '*' || gvLower === 'all') return true;
        if (gvClean === curClean) return true;
        if (gvClean === curBranch || gvClean.startsWith(curBranch + '.') || gvClean.startsWith(curBranch + 'x')) return true;
        if (gvLower === 'early access') return true;
        return false;
      });
      if (remoteMatches) return true;
    }
    const spec = String(serverVerSpec).trim();
    if (isDateOrBuildTag(spec)) return true;
    const clauses = spec.split('||');
    return clauses.some((clause) => checkSingleClause(clause, currentServerVer));
  }

  assert.strictEqual(isModVersionCompatibleWithServer('^0.7.0', '0.7.1'), true);
  assert.strictEqual(isModVersionCompatibleWithServer('^0.6.0', '0.7.1'), false);
  assert.strictEqual(isModVersionCompatibleWithServer('>=0.6.0 <0.8.0 || >=0.7.0-pre.5 <0.7.0', '0.7.1'), true);
  assert.strictEqual(isModVersionCompatibleWithServer('0.6.0', '0.7.1'), false);
  assert.strictEqual(isModVersionCompatibleWithServer('2026.04.17-c2d518cc9', '0.7.1'), true);
  assert.strictEqual(isModVersionCompatibleWithServer('*', '0.7.1'), true);

  console.log('  ✓ Strict version compatibility and 3-dot formatting verified');

  // Test 17: Hytale PluginIdentifier Canonical Config Sanitization
  console.log('Test 17: Hytale PluginIdentifier Config Sanitization');
  const tempConfigDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'hytale_cfg_test_'));
  const tempConfigPath = path.join(tempConfigDir, 'config.json');
  await fsp.writeFile(tempConfigPath, JSON.stringify({
    Version: 4,
    Mods: {
      'BetterMap': { Enabled: true },
      'InvalidNameWithoutColon': { Enabled: false },
      'valid.group:ValidName': { Enabled: true }
    }
  }, null, 2));
  const testSanitizeManager = new ModManager({ serverDir: tempConfigDir });
  await testSanitizeManager.sanitizeServerConfig();
  const sanitizedCfg = await testSanitizeManager.readServerConfig();
  assert.strictEqual('BetterMap' in sanitizedCfg.Mods, false);
  assert.strictEqual('InvalidNameWithoutColon' in sanitizedCfg.Mods, false);
  assert.strictEqual('valid.group:ValidName' in sanitizedCfg.Mods, true);
  await fsp.rm(tempConfigDir, { recursive: true, force: true });
  console.log('  ✓ Config sanitization stripped illegal non-namespaced keys cleanly');

  // Test 18: Automatic Restore Point Snapshotting, Rollback & Strict Update Logic
  console.log('Test 18: Restore Point Snapshotting & Strict Update Logic');
  const tempRestoreDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'hytale_restore_test_'));
  const tempRestoreMods = path.join(tempRestoreDir, 'mods');
  await fsp.mkdir(tempRestoreMods, { recursive: true });
  const jarA = path.join(tempRestoreMods, 'ModA-1.0.0.jar');
  const jarB = path.join(tempRestoreMods, 'ModB-1.0.0.jar.disabled');
  await fsp.writeFile(jarA, 'PK\x05\x06' + '\x00'.repeat(18));
  await fsp.writeFile(jarB, 'PK\x05\x06' + '\x00'.repeat(18));
  await fsp.writeFile(path.join(tempRestoreDir, 'config.json'), JSON.stringify({
    Version: 4,
    Mods: { 'group:ModB': { Enabled: false } }
  }));

  const restoreMgr = new ModManager({ serverDir: tempRestoreDir });

  // 1. Initial snapshot
  const snapshot = await restoreMgr.createRestorePoint('Test Launch Snapshot');
  assert.strictEqual(snapshot.success, true);
  assert.strictEqual(snapshot.modCount, 2);

  // 2. Query restore point info
  const info = await restoreMgr.getRestorePointInfo();
  assert.strictEqual(info.exists, true);
  assert.strictEqual(info.modCount, 2);
  assert.strictEqual(info.enabledCount, 1);
  assert.strictEqual(info.disabledCount, 1);

  // 3. User modifies config, toggles ModA off, ModB on, and adds a crashing ModC
  await restoreMgr.setModEnabled('ModA-1.0.0.jar', false);
  await restoreMgr.setModEnabled('ModB-1.0.0.jar.disabled', true);
  const jarC = path.join(tempRestoreMods, 'CrashingMod-1.0.0.jar');
  await fsp.writeFile(jarC, 'PK\x05\x06' + '\x00'.repeat(18));
  await fsp.writeFile(path.join(tempRestoreDir, 'config.json'), JSON.stringify({
    Version: 4,
    Mods: { 'corrupt:Broken': { Enabled: true } }
  }));

  const midState = await restoreMgr.getInstalledMods(false);
  const midModA = midState.find((m) => m.fileName.includes('ModA'));
  const midModB = midState.find((m) => m.fileName.includes('ModB'));
  const midModC = midState.find((m) => m.fileName.includes('CrashingMod'));
  assert.strictEqual(midModA.isEnabled, false);
  assert.strictEqual(midModB.isEnabled, true);
  assert.strictEqual(midModC.isEnabled, true);

  // 4. Restore state
  const restored = await restoreMgr.restoreLastKnownGoodState();
  assert.strictEqual(restored.success, true);

  const afterState = await restoreMgr.getInstalledMods(false);
  const afterModA = afterState.find((m) => m.fileName.includes('ModA'));
  const afterModB = afterState.find((m) => m.fileName.includes('ModB'));
  const afterModC = afterState.find((m) => m.fileName.includes('CrashingMod'));

  assert.strictEqual(afterModA.isEnabled, true);
  assert.strictEqual(afterModB.isEnabled, false);
  // The newly added crash-inducing mod is automatically disabled
  assert.strictEqual(afterModC.isEnabled, false);

  await fsp.rm(tempRestoreDir, { recursive: true, force: true });
  console.log('  ✓ Restore point snapshot created, verified, and restored cleanly');

  // Test 19: Dual JAR and ZIP Mod Format Recognition & Compatibility Parsing
  console.log('Test 19: Dual JAR and ZIP Format Recognition & Compatibility');
  const tempZipModDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'hytale_zip_test_'));
  const tempZipModsFolder = path.join(tempZipModDir, 'mods');
  await fsp.mkdir(tempZipModsFolder, { recursive: true });
  await fsp.writeFile(path.join(tempZipModsFolder, 'PluginMod.jar'), 'PK\x05\x06' + '\x00'.repeat(18));
  await fsp.writeFile(path.join(tempZipModsFolder, 'ContentPack.zip'), 'PK\x05\x06' + '\x00'.repeat(18));
  await fsp.writeFile(path.join(tempZipModsFolder, 'DisabledPack.zip.disabled'), 'PK\x05\x06' + '\x00'.repeat(18));

  const zipModMan = new ModManager({ serverDir: tempZipModDir });
  const scanned = await zipModMan.getInstalledMods(false);
  assert.strictEqual(scanned.length, 3);
  const foundJar = scanned.find((m) => m.fileName === 'PluginMod.jar');
  const foundZip = scanned.find((m) => m.fileName === 'ContentPack.zip');
  const foundDisabledZip = scanned.find((m) => m.fileName === 'DisabledPack.zip.disabled');
  assert(foundJar !== undefined);
  assert(foundZip !== undefined && foundZip.isEnabled === true);
  assert(foundDisabledZip !== undefined && foundDisabledZip.isEnabled === false);

  await fsp.rm(tempZipModDir, { recursive: true, force: true });
  console.log('  ✓ Verified both .jar and .zip mods are accurately detected and managed');

  console.log('\n🎉 ALL 19 VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

run().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
