# Requirements Specification — OGT (Offline Game Tracker)

## 1. Game Library Management (`REQ-LIB`)
- **REQ-LIB-01**: User can add game executables (`.exe`) via file picker modal or drag-and-drop.
- **REQ-LIB-02**: System automatically parses `.exe` PE metadata (Product Name, Company, Version, File Description) upon import.
- **REQ-LIB-03**: System extracts or generates a game icon/thumbnail and stores it locally for grid display.
- **REQ-LIB-04**: User can edit game details (Title, Developer, Genre, Cover Image, Executable Path, Launch Parameters, Custom Save Folder).
- **REQ-LIB-05**: User can remove games or filter/search the game library by name, genre, or favorite status.

## 2. Process & Playtime Tracking (`REQ-TRK`)
- **REQ-TRK-01**: User can launch a game directly from OGT.
- **REQ-TRK-02**: System detects when a game `.exe` starts running (whether launched via OGT or launched externally).
- **REQ-TRK-03**: System accurately tracks session duration in real-time while game process is active.
- **REQ-TRK-04**: System records play sessions (Start Time, End Time, Duration) and updates Total Playtime & Last Played Date.
- **REQ-TRK-05**: System handles multi-process games or launcher sub-processes gracefully without double-counting playtime.

## 3. Offline Stats & Achievements Tracker (`REQ-ACH`)
- **REQ-ACH-01**: System scans and parses local save files / achievement configs (Goldberg, CODEX, ALI213, standard INI/JSON save formats).
- **REQ-ACH-02**: System calculates total completion percentage (`(unlocked / total) * 100`).
- **REQ-ACH-03**: System displays list of achievements (Title, Description, Icon, Locked/Unlocked state, Unlock timestamp).
- **REQ-ACH-04**: User can configure or map custom save file paths and achievement files for specific offline games.
- **REQ-ACH-05**: User can manually mark achievements as unlocked or adjust stats if a game uses an unknown/custom format.

## 4. User Interface & Aesthetics (`REQ-UI`)
- **REQ-UI-01**: Ultra-premium dark mode interface with glassmorphism effects, smooth animations, and vibrant accents.
- **REQ-UI-02**: Dashboard showing global stats (Total Games, Total Playtime across all games, Achievements Unlocked count, Recently Played).
- **REQ-UI-03**: Game Detail View with dynamic backdrop hero image, stats summary, session timeline, and achievement gallery.
- **REQ-UI-04**: System tray background minimization support for background tracking while gaming.

## 5. Persistence & Offline Operation (`REQ-SYS`)
- **REQ-SYS-01**: All data (library, playtime logs, achievement cache, user settings) is stored strictly locally in JSON/SQLite.
- **REQ-SYS-02**: App functions 100% offline without requiring internet connection or remote server accounts.
