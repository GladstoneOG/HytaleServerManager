<div align="center">

# ⚔️ Hytale Server Mod Manager & Updater

[![Node.js](https://img.shields.io/badge/Node.js-20+-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-38-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![CurseForge](https://img.shields.io/badge/CurseForge-Integrated-f16436?style=for-the-badge&logo=curseforge&logoColor=white)](https://www.curseforge.com/)
[![Thunderstore](https://img.shields.io/badge/Thunderstore-Integrated-2088FF?style=for-the-badge)](https://thunderstore.io/)
[![Hytale](https://img.shields.io/badge/Hytale-Server%20v0.7+-e69138?style=for-the-badge)](https://hytale.com/)

**The all-in-one desktop manager for Hytale Dedicated Servers.**  
Browse, install, and update mods from **CurseForge** and **Thunderstore** in 1 click, automatically update your dedicated server binaries safely, manage mod profiles, and stream live server console logs.

</div>

---

## 📖 Table of Contents
- [Why Hytale Server Mod Manager?](#-why-hytale-server-mod-manager)
- [Key Features](#-key-features)
  - [1. CurseForge & Thunderstore 1-Click Install](#1-curseforge--thunderstore-1-click-install)
  - [2. Seamless Server Auto-Updater](#2-seamless-server-auto-updater)
  - [3. Mod Profiles & Team Sync](#3-mod-profiles--team-sync)
  - [4. Mod Enable/Disable & Status Management](#4-mod-enabledisable--status-management)
  - [5. Live Server Console & Execution](#5-live-server-console--execution)
- [Prerequisites](#-prerequisites)
- [Installation Guide](#-installation-guide)
  - [Quick Start (Recommended)](#quick-start-recommended)
  - [Manual Setup](#manual-setup)
- [Configuration & Initial Setup](#-configuration--initial-setup)
  - [Setting Your Server Directory](#setting-your-server-directory)
  - [Connecting Your Hytale Account](#connecting-your-hytale-account)
- [Usage Guide](#-usage-guide)
  - [Browsing & Installing Mods](#browsing--installing-mods)
  - [Updating Server in One Click](#updating-server-in-one-click)
  - [Creating and Sharing Profiles](#creating-and-sharing-profiles)
- [Architecture & Security](#-architecture--security)
- [Automated Tests](#-automated-tests)
- [License](#-license)

---

## 🌟 Why Hytale Server Mod Manager?

In Hytale, client-side modding is straightforward thanks to in-game mod browsers. However, server operators typically have to:
1. Manually search web pages and download `.jar` or `.zip` files.
2. Unpack archives and manually copy `.jar` files into `Server/mods/`.
3. Check and hunt down missing library dependencies by hand.
4. Run official command-line downloader executables (`hytale-downloader-windows-amd64.exe`), wait for 1.7+ GB downloads that can abort on connection drops, and manually extract jars and assets over old versions.

**Hytale Server Mod Manager streamlines the entire workflow into a unified GUI application.**

---

## 🚀 Key Features

### 1. CurseForge & Thunderstore 1-Click Install
* **Integrated CurseForge Search:** Uses Hytale Game ID `70216` and Mods Class `9137` to browse thousands of community mods with categories, download counts, and release notes.
* **Thunderstore Support:** Native integration with Thunderstore's `hytale` community. Packages with zipped `.jar` contents are automatically unpacked into `Server/mods/`.
* **Automatic Dependency Resolution:** Detects required dependencies (e.g. `LevelingCore`, `TagCore`, `ClassesCore`) and prompts or installs them automatically.
* **Murmur2 Reverse Fingerprinting:** Existing mod jars placed in your server directory are fingerprinted using whitespace-normalized 32-bit Murmur2 hashes and matched against CurseForge to automatically detect mod identities and updates.

### 2. Seamless Server Auto-Updater
* **Manifest Comparison:** Reads `Implementation-Version` from your server's `HytaleServer.jar` (e.g. `0.7.1`) and checks the official Hytale account service for new releases (e.g. `0.7.2`).
* **Resumable HTTP Range Downloads:** Downloads large server updates using chunked HTTP Range requests with automatic exponential backoff and retries, eliminating corrupted downloads caused by dropped connections.
* **Integrity Validation:** Validates server packages with SHA-256 before applying.
* **Automated Safety Backups:** Before overwriting binaries, copies `HytaleServer.jar`, `HytaleServer.aot.config`, and `Assets.zip` into an `updater_backups/` snapshot folder.
* **Zero Config Overwrite:** Never touches your `config.json`, world saves (`universe/`), player permissions, bans, or `mods/`.

### 3. Mod Profiles & Team Sync
* **Snapshot Profiles:** Save your current mod list as a named profile (e.g., *Vanilla+*, *RPG Overhaul*, *Hardcore Challenge*).
* **1-Click Switching:** Activate a profile to enable the mods assigned to it and disable the rest.
* **Export & Share:** Export profiles to `.json` files. When co-admins or friends import the file, any missing mods from CurseForge or Thunderstore are automatically downloaded and installed.

### 4. Mod Enable/Disable & Status Management
* Toggle individual mods on or off with a switch. The app coordinates both file renaming (`.jar` ↔ `.jar.disabled`) and the server `config.json`'s `Mods` section for thorough compatibility.
* Batch "Update All" button detects newer releases across all your installed mods.

### 5. Live Server Console & Execution
* **Start & Stop:** Start the server directly from the top bar with configurable memory allocations (`-Xms4G -Xmx6G`).
* **Real-Time Stream:** Monospace terminal with color-coded log levels (`INFO`, `WARN`, `ERROR`, `SYSTEM`).
* **Command Input:** Send server commands (`help`, `list`, `stop`, `op`, `say`) with command history (Up/Down arrow navigation).

---

## 📋 Prerequisites

Before installing the manager, ensure you have:
1. **Node.js** (v20.x or higher) — [Download Node.js](https://nodejs.org/)
2. **Java JDK / JRE** (Java 21 or Java 25 recommended for Hytale server builds)
3. A Hytale Dedicated Server installation folder (containing `HytaleServer.jar` and `mods/`).

---

## 📦 Installation Guide

### Quick Start (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/GladstoneOG/HytaleServerManager.git
   cd HytaleServerManager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

> [!TIP]
> On Windows, you can double-click [`start.bat`](start.bat) inside the project folder or run the shortcut from your server directory.

---

## ⚙️ Configuration & Initial Setup

### Setting Your Server Directory
1. Open the application and navigate to **Settings & Auth** (or click the folder path on the Dashboard).
2. Click **Browse...** and select your Hytale server directory (e.g. `F:\serverht\Server`).
3. The application will instantly detect:
   - Current installed `HytaleServer.jar` version
   - Existing `.jar` files in `mods/`
   - Active `config.json` settings

### Connecting Your Hytale Account
To enable seamless 1-click server updates without using the command-line downloader:
1. Go to the **Settings & Auth** tab.
2. Click **Connect Hytale Account**.
3. The app starts an official OAuth 2.0 Device Code session and automatically opens the verification URL in your browser.
4. Confirm the authorization code shown in the app.
5. Once authorized in your browser, the manager saves your session credentials locally to `.hytale-downloader-credentials.json`.

> [!IMPORTANT]
> Your credentials and tokens are stored **strictly locally** on your machine and are never transmitted to any third-party server or repository.

---

## 🎮 Usage Guide

### Browsing & Installing Mods
1. Click the **CurseForge** or **Thunderstore** tab in the sidebar.
2. Search by mod name or filter by category (Gameplay, Quality of Life, Utility, Mobs, etc.).
3. Click **Details** to read the mod description, or click **Install**.
4. The manager downloads the mod and its required dependencies directly into `Server/mods/`.

### Updating Server in One Click
1. If an update is detected upstream (e.g. `0.7.2`), an **Update Available** banner appears on the Dashboard.
2. Click **One-Click Update Now**.
3. The manager automatically downloads the update, verifies the SHA-256 checksum, backs up your existing server files to `updater_backups/`, extracts the new binaries, and re-scans the installation.

### Creating and Sharing Profiles
1. Go to the **Profiles** tab.
2. Click **+ New Profile from Current** and enter a name (e.g. `AdventurePack-v1`).
3. Click **Export** to save the profile as a `.json` file to send to friends.
4. Friends can click **Import Profile JSON**; the manager will auto-download all required CurseForge and Thunderstore mods in the profile.

---

## 🔒 Architecture & Security

```
HytaleServerManager/
├── src/
│   ├── main/
│   │   ├── main.js             # Electron application lifecycle
│   │   ├── ipc.js              # Secure IPC communication bridge
│   │   ├── curseforge.js       # CurseForge API (search, download, dependency resolution)
│   │   ├── thunderstore.js     # Thunderstore API & package extractor
│   │   ├── hytaleAuth.js       # OAuth 2.0 Device Code client & credential manager
│   │   ├── serverUpdater.js    # Resumable Range updater & binary backup engine
│   │   ├── modManager.js       # Jar manifest parser, profiles, toggle switches
│   │   ├── serverRunner.js     # Java process manager & real-time console streaming
│   │   ├── murmur2.js          # Murmur2 whitespace-normalized fingerprint engine
│   │   ├── http.js             # Resumable HTTP Range downloader with checksums
│   │   ├── zip.js              # Zip extraction & manifest reader
│   │   └── util.js             # Safe file naming, atomic JSON writes, semver comparison
│   ├── preload/
│   │   └── preload.js          # Context isolation API bridge
│   └── renderer/
│       ├── index.html          # Clean dark-themed dashboard UI
│       ├── style.css           # Modular Hytale/CurseForge design theme
│       └── renderer.js         # Reactive UI controllers & event listeners
├── test/
│   └── run-tests.js            # Automated verification test suite
├── .gitignore                  # Strict credential, secret & cache exclusion
├── package.json
└── README.md
```

### Security Policy
- **No Hardcoded Secrets:** No API keys or tokens are stored in the codebase.
- **Strict `.gitignore`:** All credential formats (`.hytale-downloader-credentials.json`, `*token*`, `*credentials*`, `auth.enc`, `*.env`) are strictly ignored.
- **Context Isolation:** Electron runs with `contextIsolation: true`, `nodeIntegration: false`, and strict IPC channels.

---

## 🧪 Automated Tests

Run the built-in verification test suite anytime:
```bash
npm test
```

The test suite validates:
- [x] Version comparison & semver logic
- [x] Murmur2 normalized fingerprint computation
- [x] Local `HytaleServer.jar` manifest reading
- [x] Credential discovery and OAuth state parsing
- [x] Mod manifest and enabled/disabled state detection
- [x] CurseForge Hytale search & metadata API
- [x] Thunderstore Hytale community package API
- [x] Profile snapshot creation and activation

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Hytale is a trademark of Hypixel Studios Ltd. This project is an independent community tool and is not officially affiliated with Hypixel Studios.
