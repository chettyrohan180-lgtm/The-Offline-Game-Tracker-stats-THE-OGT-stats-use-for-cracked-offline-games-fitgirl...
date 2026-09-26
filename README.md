# OGT — Offline Game Tracker

> A **100% offline**, privacy-first Windows desktop app to track your cracked/offline game library — playtime, sessions, achievements, and stats. No Steam. No internet. No telemetry.

Built with **Electron 28 + Vite 5 + Vanilla JS/CSS**.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎮 **Game Library** | Import any `.exe`, auto-extract metadata from PE headers (name, company, version, icon) |
| ⏱️ **Playtime Tracking** | Real-time process detection via `tasklist`, auto-logs sessions when you start/stop a game |
| 🏆 **Achievements** | Scans local save files — supports Goldberg SteamEmu, CODEX `.ini`, and JSON formats |
| 📊 **Dashboard** | Global stats overview — total playtime, recent sessions, completion charts |
| 🌌 **Premium UI** | Dark glassmorphism design, frameless window, custom titlebar, system tray support |
| 🔒 **100% Offline** | Zero network calls. All data stored locally in a plain JSON file on your machine |

---

## 🛠️ Tech Stack

- **Shell**: Electron 28 (frameless, tray-aware)
- **Renderer**: Vite 5 + Vanilla HTML/CSS/JS
- **Database**: Atomic JSON file via `fs` (no SQLite, no external DB)
- **Process Tracking**: `child_process.exec('tasklist')` — native Windows API
- **PE Parsing**: Node.js `fs` binary read of Windows PE headers
- **IPC**: Electron `contextBridge` + `ipcRenderer/ipcMain` (sandboxed)

---

## 📁 Project Structure

```
OGT/
├── electron/
│   ├── main.js              # Main process — window, tray, all IPC handlers
│   ├── preload.js           # Context bridge — exposes safe window.electronAPI
│   ├── db.js                # Atomic JSON database service (read/write with .tmp swap)
│   ├── processWatcher.js    # tasklist polling engine — detects game start/stop
│   ├── peParser.js          # Windows PE binary header parser (metadata extraction)
│   ├── iconExtractor.js     # .exe icon extractor → saves as .png to userData
│   └── achievementParser.js # Save file scanner — Goldberg, CODEX, INI, JSON
├── src/
│   └── renderer/
│       ├── index.html       # App UI shell — all views, modals, and layout
│       ├── app.js           # View router, IPC bindings, event handlers
│       └── styles/
│           └── theme.css    # Dark glassmorphism CSS design system & tokens
├── data/                    # ⚠️ Local runtime data (gitignored — never committed)
│   └── ogt-database.json    # Your game library, sessions, and achievements
├── .planning/               # GSD workflow docs (gitignored)
├── .gitignore
├── package.json
└── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ → [nodejs.org](https://nodejs.org/)
- **Windows** 10/11 (required for `.exe` tracking and PE parsing)
- **npm** v9+

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/OGT.git
cd OGT

# 2. Install dependencies
npm install

# 3. Approve Electron's binary install script (first time only)
npm install-scripts approve electron
npm install-scripts approve esbuild

# 4. Re-run install to download the Electron binary
npm install
```

> **Note**: If Electron fails to download automatically (network restrictions), manually extract the cached zip:
> ```powershell
> # Find cached zip in: %LOCALAPPDATA%\electron\Cache\<hash>\electron-v28.x.x-win32-x64.zip
> # Extract it to: node_modules\electron\dist\
> # Then create: node_modules\electron\path.txt  (content: electron.exe)
> ```

### Running in Development

```bash
# Terminal 1 — Start Vite dev server (renderer)
npm run dev

# Terminal 2 — Launch Electron (connects to Vite on port 5173)
npm run electron

# Or run both together with:
npm run electron-dev
```

### Building for Production

```bash
npm run build
```

---

## 📦 Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Vite dev server only (renderer at `localhost:5173`) |
| `npm run electron` | Launch Electron in dev mode (requires Vite running) |
| `npm run electron-dev` | Start Vite + Electron together via `concurrently` |
| `npm run build` | Build renderer bundle to `dist/` |
| `npm start` | Launch Electron in production mode |

---

## 🔒 Security & Privacy

OGT is designed to be **completely local and offline**:

- ✅ No internet connection required
- ✅ No user accounts, tokens, or API keys
- ✅ No analytics, crash reporting, or telemetry
- ✅ All data stored in a plain JSON file in your user's `AppData` folder
- ✅ `nodeIntegration: false` + `contextIsolation: true` (Electron secure defaults)
- ✅ All Node.js APIs locked behind a safe `contextBridge` preload
- ✅ Database writes use atomic `.tmp` → rename pattern (no corruption on crash)
- ⚠️ Demo cover images load from **Unsplash** (internet required for thumbnails only — replaceable with local paths)

See [`SECURITY.md`](./SECURITY.md) for the full audit.

---

## 📄 Data Storage

Your game data is saved at:

```
Windows: C:\Users\<YourName>\AppData\Roaming\ogt-offline-game-tracker\ogt-database.json
Dev mode: <project-root>\data\ogt-database.json
```

The file is plain JSON — you can back it up, edit it, or migrate it freely.

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📜 License

**MIT** — Free to use, modify, and distribute. Designed for offline gaming privacy.

---

*OGT is a personal project. It does not endorse or facilitate piracy — it is simply a game library manager for executables you already own locally.*
