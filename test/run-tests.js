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

  console.log('\n🎉 ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

run().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
