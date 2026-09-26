# OGT — Offline Game Tracker

OGT (Offline Game Tracker) is a modern Windows desktop application built with **Electron**, **Vite**, and **JavaScript/HTML/CSS** that allows you to manage, track, and analyze your offline game collection without needing internet connectivity or online launcher logins.

---

## 🌟 Key Features

- 🎮 **Game Library Management**: Import `.exe` game files, extract metadata, and display your game collection in a dark glassmorphism grid layout.
- ⏱️ **Real-Time Playtime Tracking**: Automatically detect when games start/stop, log session durations, and aggregate total playtime.
- 🏆 **Offline Achievements & Stats**: Scan local save files and emulator configurations (Goldberg, CODEX, INI/JSON formats) to display achievement badges and completion percentages.
- 🌌 **Ultra-Premium UI**: Glassmorphism aesthetic, dark space design tokens, custom frameless window controls, and background system tray support.
- 🔒 **100% Offline & Private**: Zero server dependencies or external data telemetry—all data stays on your local machine.

---

## 🛠️ Project Structure

```text
OGT/
├── electron/
│   ├── main.js       # Main Electron process, window manager & IPC handlers
│   ├── preload.js    # Context bridge exposing safe window.electronAPI
│   └── db.js         # Atomic file-backed JSON database service
├── src/
│   └── renderer/
│       ├── index.html    # App UI shell & layout structure
│       ├── app.js        # View router, IPC bindings & modal handlers
│       └── styles/
│           └── theme.css # Dark glassmorphism CSS design system
├── .planning/        # GSD workflow project specification & roadmap
├── package.json
└── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- Windows OS (target platform for `.exe` file tracking)

### Installation & Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run in development mode:
   ```bash
   npm run dev
   ```

3. Build production bundle:
   ```bash
   npm run build
   ```

---

## 📜 License

MIT License. Designed & Developed for offline gaming privacy.
