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
          // Process started
          this.onGameStarted(game, matchingProc.pid, false);
        } else if (matchingProc && activeSess && !activeSess.isSimulated) {
          // Process heartbeat tick
          this.onGameTick(activeSess);
        } else if (!matchingProc && activeSess && !activeSess.isSimulated) {
          // Process stopped
          this.onGameStopped(game.id);
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
      pid: pid || 'SIMULATED',
      durationSeconds: 0,
      isSimulated
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
   * Launch a game binary and attach process watcher
   */
  launchGame(gameId) {
    const game = db.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    if (this.activeSessions.has(gameId)) {
      return { status: 'already_running', session: this.activeSessions.get(gameId) };
    }

    if (game.exePath && require('fs').existsSync(game.exePath)) {
      try {
        const child = require('child_process').spawn(game.exePath, game.launchParams ? game.launchParams.split(' ') : [], {
          detached: true,
          cwd: path.dirname(game.exePath),
          stdio: 'ignore'
        });
        child.unref();

        this.onGameStarted(game, child.pid, false);
        return { status: 'launched', pid: child.pid };
      } catch (err) {
        console.warn(`[OGT Launcher] Failed to spawn ${game.exePath}:`, err.message);
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
