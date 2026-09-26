# Domain & Technical Research: Offline Game Tracking Engine

## 1. Executable (`.exe`) Metadata & Information Extraction
When a user adds a `.exe` file:
- **PE Header Parsing**: Windows PE (Portable Executable) binaries store metadata in `IMAGE_RESOURCE_DIRECTORY`.
- **Properties to Extract**:
  - `FileDescription` & `ProductName` (Used as default Game Title).
  - `FileVersion` & `ProductVersion`.
  - `CompanyName` / Publisher.
  - Executable Icon (extracted to PNG/ICO via resource extractor for launcher display).
- **Fallback**: Folder name / file base name cleanup if PE header properties are empty or obfuscated.

## 2. Real-Time Process & Playtime Tracking
- **Process Detection**:
  - Monitor running processes using Windows process tools (`tasklist`, WMI process events, or native Node OS utilities).
  - Match process by executable name (`game.exe`) or PID when launched via OGT.
- **Session Lifecycle**:
  - **Launch Event**: Record start timestamp, set game state to `Playing`.
  - **Active Session Loop**: Heartbeat check every 3-5 seconds.
  - **Termination Event**: Record stop timestamp, compute session elapsed duration, update total game playtime and last played date.
  - Save session log entry to local SQLite / JSON storage database.

## 3. Offline Achievements & Stats Parser Engine
Offline games usually store achievements and stats in localized config/save files:
- **Steam Emulator Formats**:
  - *Goldberg Emulator*: Stores stats & achievements in `%AppData%\Goldberg SteamEmu Saves\settings\` or game folder `\saves\` (`achievements-json`, `stats`).
  - *CODEX / RUNE*: `C:\Users\Public\Documents\EMPRESS\` or `%AppData%\Roaming\Steam\CODEX\<AppId>\` (`achievements.ini`, `stats.bin`).
  - *FLT / SKIDROW / ALI213*: `%AppData%\Roaming\` or `%LocalAppData%` save folders.
- **Generic / Custom Save Watcher**:
  - Support directory watching on target save locations (`chokidar` or `fs.watch`).
  - Allow users to map custom save/stats file patterns (JSON, INI, XML, binary).
  - Built-in completion calculator: `Unlocked Achievements / Total Achievements * 100`.

## 4. Architectural Stack
- **Electron (Main Process)**: Manages IPC, filesystem I/O, process monitoring, PE metadata parsing, SQLite database storage.
- **Electron (Renderer Process)**: Modern UI (HTML5, CSS3, JS) with Glassmorphism aesthetic, library grid, game detailed view, stats charts, achievement grid, launch buttons.
