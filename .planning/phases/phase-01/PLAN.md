# Phase 1 Plan: Project Setup & Core Architecture Shell

## Phase Objective
Set up the foundational Electron + Vite application framework for OGT (Offline Game Tracker), including IPC communication bridge, local database layer (SQLite / Lowdb persistent storage schema), core UI layout shell with dark glassmorphism styling, and background tray lifecycle.

## Target Deliverables
1. `package.json` with required Electron, Vite, persistent database, and UI dependencies.
2. Electron Main Process (`electron/main.js`), Preload Bridge (`electron/preload.js`), and Vite config (`vite.config.js`).
3. Local Storage/Database Service (`electron/db.js`) handling `games`, `sessions`, `achievements`, and `settings` tables/collections.
4. Base UI Shell (`src/renderer/index.html`, `src/renderer/styles/theme.css`, `src/renderer/app.js`) featuring sidebar navigation, glassmorphism design tokens, view routing, and top bar.
5. IPC Communication Channels (`db:*`, `app:*`, `tray:*`) linking Renderer to Main process.

---

## Detailed Task Sequence

### Task 1: Package Initialization & Build Configuration
- Initialize `package.json` with scripts: `dev`, `build`, `preview`.
- Configure `vite.config.js` with renderer entry point `src/renderer/index.html`.
- Set up main entry point `electron/main.js` and preload script `electron/preload.js`.

### Task 2: Local Database Service & IPC Bridge
- Create `electron/db.js` using local file-backed JSON database or SQLite for zero external dependency runtime.
- Define initial data models for:
  - `games` (id, title, exePath, productName, company, version, iconPath, coverImage, genre, launchParams, createdAt)
  - `sessions` (id, gameId, startTime, endTime, durationSeconds)
  - `achievements` (id, gameId, key, title, description, isUnlocked, unlockedAt)
  - `settings` (theme, minimizeToTray, startOnBoot)
- Register IPC handlers in `electron/main.js`:
  - `ipcMain.handle('db:get-games', ...)`
  - `ipcMain.handle('db:save-game', ...)`
  - `ipcMain.handle('db:delete-game', ...)`
  - `ipcMain.handle('db:get-sessions', ...)`
  - `ipcMain.handle('db:save-session', ...)`
  - `ipcMain.handle('app:get-version', ...)`

### Task 3: Core UI Layout Shell & Design System
- Create `src/renderer/styles/theme.css` with premium design tokens:
  - Dark background gradients (`#0a0d14`, `#121824`, `#1a2333`)
  - Glassmorphism panels (`backdrop-filter: blur(16px); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08)`)
  - Neon accent highlights (`#6366f1` Indigo, `#8b5cf6` Purple, `#10b981` Emerald, `#f59e0b` Amber)
  - Custom scrollbars, glow effects, and micro-interactions.
- Create `src/renderer/index.html`:
  - Sidebar with icons (Dashboard, Library, Session Logs, Settings).
  - Header bar with search input, status indicator, and window control buttons.
  - Main View Container with dynamic view switching.
- Create `src/renderer/app.js`:
  - Navigation view router.
  - Initial database loading test & UI state binding.

### Task 4: System Tray & Window Controls Integration
- Implement System Tray icon menu in `electron/main.js` (Show/Hide OGT, Exit).
- Handle window minimize to system tray if enabled.

---

## Verification Criteria
- [ ] Run `npm run dev` or launch script successfully without module errors.
- [ ] Electron window opens displaying dark glassmorphism layout shell.
- [ ] Sidebar navigation toggles active view sections cleanly.
- [ ] IPC channel invocation from renderer (`window.electronAPI.getGames()`) returns valid dataset from database.
- [ ] Database file created in user app data directory.
