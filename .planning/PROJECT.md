# OGT — Offline Game Tracker

## Overview
OGT (Offline Game Tracker) is a modern Windows desktop application designed to track, manage, and analyze offline games independently. It allows users to register local game executables (`.exe`), automatically extract game metadata, continuously track active game processes to log play time and sessions, and parse local save files/achievement data to track player stats, achievements, and completion percentages—similar to Steam/GOG, but strictly offline-focused.

## Core Capabilities
1. **Game Library Management**:
   - Add/import game executables (`.exe`) and auto-detect installation folders.
   - Extract executable metadata (PE headers, file version, icons, embedded resources).
   - Support manual and automated game metadata matching (title, banner, cover art, release info).

2. **Process & Activity Tracking**:
   - Monitor game process launch, running duration, and termination in real-time.
   - Record play sessions, total playtime, last played date, and play frequency.
   - Background file and process polling with low system overhead.

3. **Offline Stats & Achievements Engine**:
   - Detect and parse save files, achievement configs, and local save states (e.g., AppData, Documents, Steam emulators like Goldberg/CODEX/ALI213, standard save formats).
   - Track achievement unlock status, timestamps, and overall game completion percentage.
   - Custom achievement / stat override and manual progress logging for unsupported games.

4. **Premium Visual Dashboard**:
   - Modern dark-mode visual interface with fluid animations, game art banners, dynamic charts, and achievement badges.
   - Detailed per-game view with stats, playtime graphs, achievement lists, and quick launch button.

## Target Tech Stack
- **Desktop Framework**: Electron + Vite / Node.js native integrations (Windows target)
- **Frontend UI**: Modern HTML5, Vanilla CSS / Design Tokens (Glassmorphism, Dark Mode, Micro-animations), JavaScript / TypeScript
- **Native Integrations**: Windows PE Metadata Reader, Process Watcher (Windows Tasklist / WMI), File System Watcher for saves/configs

## Strategic Goals
- Provide 100% offline, privacy-first game tracking without requiring online launcher logins.
- Deliver a fast, responsive, and visually stunning UI that rivals modern commercial game launchers.
- Ensure resilient detection for a wide range of offline game structures and save locations.
