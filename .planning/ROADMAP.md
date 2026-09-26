# Project Roadmap — OGT (Offline Game Tracker)

## Phase Structure

### Phase 1: Project Setup & Core Architecture Shell
- Initialize Electron + Vite application structure.
- Setup IPC handlers, main process lifecycle, and local persistent database (SQLite / Lowdb).
- Create core UI layout shell with dark glassmorphism styling system and navigation.
- **Verification**: App boots smoothly, database initializes, IPC messaging verified.

### Phase 2: Game Library Management & PE Metadata Extractor
- Build `.exe` game import file picker and drag-and-drop handlers.
- Implement PE header metadata parser (Title, Publisher, Version extraction).
- Build icon / thumbnail extractor for `.exe` files.
- Create Game Library Grid with search, filtering, and manual metadata editing modal.
- **Verification**: User can import `.exe` files, metadata/icon are extracted, library persists across restarts.

### Phase 3: Process & Playtime Tracking Engine
- Implement background process watcher to detect when target `.exe` starts and stops running.
- Build Game Launcher trigger from OGT UI.
- Log play sessions (Start Time, End Time, Duration) and aggregate Total Playtime.
- Support background system tray minimization for continuous tracking.
- **Verification**: Launching game logs exact duration, process termination correctly closes session and updates database.

### Phase 4: Offline Achievements & Stats Engine
- Build save file & config scanner for common offline save structures (Goldberg, CODEX, JSON, INI).
- Parse achievement states (Locked / Unlocked, timestamp, title, description, icon).
- Calculate game completion percentage (`(Unlocked / Total) * 100`).
- Provide custom save path configuration and manual achievement toggle override.
- **Verification**: Save file updates dynamically reflect achievement unlocks and completion percentage in UI.

### Phase 5: Dashboard Visualization & UI Polish
- Create main Dashboard with global stats (Total Playtime, Total Games, Achievements Unlocked count, Recent Session history).
- Create Game Detail Hero View with dynamic background banners, session graphs, and achievement grid.
- Implement smooth transitions, micro-animations, and UI theme enhancements.
- **Verification**: Complete end-to-end user workflow validated from executable import to process tracking and achievement display.
