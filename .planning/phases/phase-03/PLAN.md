# Phase 3 Plan: Process & Playtime Tracking Engine

## Phase Objective
Build the real-time Windows process monitoring service, direct game executable launcher, live session duration logger, and UI state synchronization for active gaming sessions.

## Target Deliverables
1. `electron/processWatcher.js`: Background process monitoring engine that inspects active Windows tasks using `tasklist` / WMI and manages active game session lifecycles.
2. Enhanced Main Process IPC (`electron/main.js` & `electron/preload.js`):
   - `game:launch`: Spawns `.exe` binaries with optional launch arguments.
   - `game:status-update` event push: Broadcasts active session updates (Game ID, Session Duration, Active Status) to Renderer.
3. Live Session UI in Renderer (`src/renderer/index.html` & `src/renderer/app.js`):
   - Glowing "Currently Playing" banner on Dashboard with live stopwatch counter (`HH:MM:SS`).
   - "Launch Game" button updates to "Playing..." / "Active" when game process is running.
   - Session Logs view automatically receives and renders completed session entries upon game exit.

---

## Detailed Task Sequence

### Task 1: Background Process Watcher Service (`electron/processWatcher.js`)
- Create `ProcessWatcher` singleton class that polls active processes every 3 seconds.
- Execute Windows `tasklist` command in child process to retrieve running process image names.
- Match active processes against registered `exePath` and `.exe` filenames in `db.getGames()`.
- Session Management:
  - **Start**: When a matched process begins, log `startTime = Date.now()`, initialize session tracker.
  - **Heartbeat**: Calculate live duration `(Date.now() - startTime) / 1000`.
  - **Stop**: When matched process closes, compute final duration, record session to database via `db.addSession()`, update total playtime, and broadcast `game:stopped`.

### Task 2: Game Launcher & IPC Event Channels
- Register `game:launch` handler in `electron/main.js` using `child_process.spawn`.
- Handle custom launch parameters and working directory resolution (set `cwd` to `.exe` parent folder).
- Setup two-way event push: `mainWindow.webContents.send('tracker:session-update', activeSessionData)`.

### Task 3: Live Renderer UI Shell & Activity Banner
- Add "Currently Playing" glowing status card to top of Dashboard view (`#active-game-banner`).
- Update `src/renderer/app.js` to listen for `tracker:session-update` events from IPC preload.
- Display live ticking timer (`00:05:42`) and active game banner when a game is running.
- Instantly refresh stat cards (Total Playtime) and Play Sessions table when a session completes.

---

## Verification Criteria
- [ ] Clicking "Launch Game" launches target `.exe` and starts process watcher tracking.
- [ ] Launching game externally (outside OGT) is detected by background process watcher.
- [ ] Live session banner appears on Dashboard with real-time ticking timer.
- [ ] Closing the game process automatically completes session, logs exact duration, and updates total playtime in database.
- [ ] Session history table updates immediately with completed session log.
