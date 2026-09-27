const { exec } = require('child_process');
const path = require('path');
const db = require('./db');

class ProcessWatcher {
  constructor() {
    this.intervalId = null;
    this.activeSessions = new Map(); // gameId -> { gameId, title, startTime, pid, durationSeconds, isSimulated }
    this.mainWindow = null;
    this.pollIntervalMs = 3000;
  }

  init(mainWindow) {
    this.mainWindow = mainWindow;
    this.startPolling();
  }

  startPolling() {
    if (this.intervalId) return;
    console.log('[OGT Process Watcher] Started process monitoring engine (3s polling)...');
    
    // Initial check
    this.checkProcesses();
    this.intervalId = setInterval(() => this.checkProcesses(), this.pollIntervalMs);
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Executes Windows tasklist to query running processes
   */
  checkProcesses() {
    // Only run on Windows environment (or fallback mock)
    if (process.platform !== 'win32') {
      this.updateSimulatedSessions();
      return;
    }

    exec('tasklist /FO CSV /NH', (error, stdout) => {
      if (error) {
        // Fallback or permission error
        this.updateSimulatedSessions();
        return;
      }

      const runningProcesses = this.parseTaskList(stdout);
      const registeredGames = db.getGames();

      registeredGames.forEach(game => {
        if (!game.exePath) return;

        const exeFileName = path.basename(game.exePath).toLowerCase();
        const matchingProc = runningProcesses.find(p => p.name.toLowerCase() === exeFileName);

        const activeSess = this.activeSessions.get(game.id);

        if (matchingProc && !activeSess) {
          // Process started externally
          this.onGameStarted(game, matchingProc.pid, false);
        } else if (matchingProc && activeSess && !activeSess.isSimulated) {
          // Process heartbeat tick
          activeSess.hasEverMatched = true;
          if (activeSess.pid === 'PENDING' || !activeSess.pid) {
            activeSess.pid = matchingProc.pid;
          }
          this.onGameTick(activeSess);
        } else if (!matchingProc && activeSess && !activeSess.isSimulated) {
          // Give newly launched games a 15-second grace period to appear in tasklist
          const startupGraceMs = 15000;
          const isStartingUp = !activeSess.hasEverMatched && (Date.now() - activeSess.startTimestamp) < startupGraceMs;
          if (!isStartingUp) {
            // Process genuinely stopped
            this.onGameStopped(game.id);
          }
        }
      });

      // Handle simulated sessions tick
      this.updateSimulatedSessions();
    });
  }

  parseTaskList(stdout) {
    const processes = [];
    const lines = stdout.split('\n');

    lines.forEach(line => {
      const match = line.match(/^"([^"]+)","(\d+)"/);
      if (match) {
        processes.push({ name: match[1], pid: match[2] });
      }
    });

    return processes;
  }

  onGameStarted(game, pid = null, isSimulated = false) {
    const now = new Date().toISOString();
    const sessionData = {
      gameId: game.id,
      title: game.title,
      coverImage: game.coverImage,
      startTime: now,
      startTimestamp: Date.now(),
      pid: pid || 'PENDING',
      durationSeconds: 0,
      isSimulated,
      hasEverMatched: !!pid && pid !== 'PENDING' && pid !== 'SIMULATED'
    };

    this.activeSessions.set(game.id, sessionData);
    console.log(`[OGT Process Watcher] Game session STARTED: ${game.title} (PID: ${sessionData.pid})`);

    this.notifyRenderer('tracker:session-started', sessionData);
  }

  onGameTick(sessionData) {
    sessionData.durationSeconds = Math.round((Date.now() - sessionData.startTimestamp) / 1000);
    this.notifyRenderer('tracker:session-tick', sessionData);
  }

  onGameStopped(gameId) {
    const sessionData = this.activeSessions.get(gameId);
    if (!sessionData) return;

    const endTime = new Date().toISOString();
    const finalDurationSeconds = Math.max(1, Math.round((Date.now() - sessionData.startTimestamp) / 1000));

    console.log(`[OGT Process Watcher] Game session STOPPED: ${sessionData.title}. Duration: ${finalDurationSeconds}s`);

    // Record session to persistent database
    const savedSession = db.addSession({
      gameId: sessionData.gameId,
      startTime: sessionData.startTime,
      endTime,
      durationSeconds: finalDurationSeconds
    });

    this.activeSessions.delete(gameId);

    this.notifyRenderer('tracker:session-stopped', {
      gameId: sessionData.gameId,
      savedSession,
      updatedGames: db.getGames()
    });
  }

  updateSimulatedSessions() {
    this.activeSessions.forEach((session, gameId) => {
      if (session.isSimulated) {
        this.onGameTick(session);
      }
    });
  }

  /**
   * Launch a game binary safely with Windows elevation (UAC) support and attach process watcher
   */
  async launchGame(gameId) {
    const game = db.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    if (this.activeSessions.has(gameId)) {
      return { status: 'already_running', session: this.activeSessions.get(gameId) };
    }

    if (game.exePath && require('fs').existsSync(game.exePath)) {
      const gameDir = path.dirname(game.exePath);
      let launched = false;

      // Strategy 1: If launch parameters exist, use Windows 'start' via ShellExecute to support UAC & params
      if (game.launchParams && game.launchParams.trim()) {
        try {
          const cmd = `cmd.exe /c start "" /D "${gameDir}" "${game.exePath}" ${game.launchParams.trim()}`;
          await new Promise((resolve, reject) => {
            exec(cmd, { cwd: gameDir, windowsHide: true }, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          launched = true;
        } catch (err) {
          console.warn('[OGT Launcher] Failed to launch with cmd start params:', err.message);
        }
      }

      // Strategy 2: Native Electron shell.openPath
      // shell.openPath invokes Windows ShellExecuteEx natively, which triggers the UAC prompt
      // if administrator elevation is required, avoiding EACCES errors.
      if (!launched) {
        try {
          let electronShell = null;
          try { electronShell = require('electron').shell; } catch (e) {}
          if (electronShell && typeof electronShell.openPath === 'function') {
            const errMsg = await electronShell.openPath(game.exePath);
            if (!errMsg) {
              launched = true;
            } else {
              console.warn('[OGT Launcher] shell.openPath returned:', errMsg);
            }
          }
        } catch (err) {
          console.warn('[OGT Launcher] shell.openPath failed:', err.message);
        }
      }

      // Strategy 3: Standard Windows 'start' command
      if (!launched) {
        try {
          const cmd = `cmd.exe /c start "" /D "${gameDir}" "${game.exePath}"`;
          await new Promise((resolve, reject) => {
            exec(cmd, { cwd: gameDir, windowsHide: true }, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          launched = true;
        } catch (err) {
          console.warn('[OGT Launcher] cmd start fallback failed:', err.message);
        }
      }

      // Strategy 4: PowerShell Start-Process fallback
      if (!launched) {
        try {
          const escapedPath = game.exePath.replace(/'/g, "''");
          const escapedDir = gameDir.replace(/'/g, "''");
          const psCmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '${escapedPath}' -WorkingDirectory '${escapedDir}'"`;
          await new Promise((resolve, reject) => {
            exec(psCmd, { windowsHide: true }, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          launched = true;
        } catch (err) {
          console.warn('[OGT Launcher] PowerShell Start-Process fallback failed:', err.message);
        }
      }

      // Strategy 5: child_process.spawn with explicit error handling (so EACCES never becomes an uncaught exception)
      if (!launched) {
        try {
          await new Promise((resolve, reject) => {
            const child = require('child_process').spawn(game.exePath, game.launchParams ? game.launchParams.split(' ') : [], {
              detached: true,
              cwd: gameDir,
              stdio: 'ignore'
            });
            child.on('error', (spawnErr) => {
              console.warn('[OGT Launcher] spawn error safely handled:', spawnErr.message);
              reject(spawnErr);
            });
            child.unref();
            resolve(child.pid);
          });
          launched = true;
        } catch (err) {
          console.warn('[OGT Launcher] child_process.spawn failed:', err.message);
        }
      }

      if (launched) {
        this.onGameStarted(game, 'PENDING', false);
        // Force an immediate process check in 2 seconds to attach the real Windows PID
        setTimeout(() => this.checkProcesses(), 2000);
        return { status: 'launched' };
      }
    }

    // Fallback: Start interactive session for demo / missing path
    this.onGameStarted(game, null, true);
    return { status: 'simulated' };
  }

  stopSession(gameId) {
    if (this.activeSessions.has(gameId)) {
      this.onGameStopped(gameId);
      return true;
    }
    return false;
  }

  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  notifyRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

module.exports = new ProcessWatcher();
