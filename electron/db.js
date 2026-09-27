const fs = require('fs');
const path = require('path');
let app = null;
try {
  app = require('electron').app;
} catch (e) {
  // Safe fallback when running outside Electron main process
}

class DatabaseService {
  constructor() {
    // In production/electron context use userData, fallback to local dir for testing
    const userDataPath = (app && typeof app.getPath === 'function') ? app.getPath('userData') : path.join(process.cwd(), 'data');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    this.dbFilePath = path.join(userDataPath, 'ogt-database.json');
    this.data = {
      games: [],
      sessions: [],
      achievements: [],
      settings: {
        theme: 'dark-glass',
        minimizeToTray: true,
        closeToTray: true,
        autoScanSaveFiles: true,
        checkProcessIntervalSeconds: 3
      }
    };
    
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const rawContent = fs.readFileSync(this.dbFilePath, 'utf8');
        const parsed = JSON.parse(rawContent);
        this.data = {
          games: parsed.games || [],
          sessions: parsed.sessions || [],
          achievements: parsed.achievements || [],
          settings: { ...this.data.settings, ...(parsed.settings || {}) }
        };
      } else {
        // Fresh install — start with an empty library
        this.save();
      }
    } catch (err) {
      console.error('[OGT DB] Error loading database, reinitializing with empty state:', err);
      // Reset to clean empty state on corruption
      this.save();
    }
  }


  save() {
    try {
      const tempPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.error('[OGT DB] Failed to save database:', err);
    }
  }

  // Games CRUD
  getGames() {
    return this.data.games;
  }

  getGameById(id) {
    return this.data.games.find(g => g.id === id) || null;
  }

  saveGame(gameData) {
    const existingIndex = this.data.games.findIndex(g => g.id === gameData.id);
    if (existingIndex >= 0) {
      this.data.games[existingIndex] = { ...this.data.games[existingIndex], ...gameData, updatedAt: new Date().toISOString() };
    } else {
      const newGame = {
        id: gameData.id || `game-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: gameData.title || 'Untitled Game',
        exePath: gameData.exePath || '',
        productName: gameData.productName || '',
        company: gameData.company || 'Unknown Publisher',
        version: gameData.version || '1.0.0',
        iconPath: gameData.iconPath || '',
        coverImage: gameData.coverImage || '',
        bannerImage: gameData.bannerImage || '',
        genre: gameData.genre || 'Action',
        launchParams: gameData.launchParams || '',
        totalPlaytimeMinutes: gameData.totalPlaytimeMinutes || 0,
        lastPlayed: null,
        favorite: gameData.favorite || false,
        createdAt: new Date().toISOString()
      };
      this.data.games.push(newGame);
    }
    this.save();
    return this.getGames();
  }

  deleteGame(id) {
    this.data.games = this.data.games.filter(g => g.id !== id);
    this.data.sessions = this.data.sessions.filter(s => s.gameId !== id);
    this.data.achievements = this.data.achievements.filter(a => a.gameId !== id);
    this.save();
    return this.getGames();
  }

  toggleFavorite(id) {
    const game = this.getGameById(id);
    if (game) {
      game.favorite = !game.favorite;
      this.save();
    }
    return this.getGames();
  }

  // Sessions CRUD
  getSessions(gameId = null) {
    if (gameId) {
      return this.data.sessions.filter(s => s.gameId === gameId);
    }
    return this.data.sessions;
  }

  addSession(sessionData) {
    const newSession = {
      id: `sess-${Date.now()}`,
      gameId: sessionData.gameId,
      startTime: sessionData.startTime || new Date().toISOString(),
      endTime: sessionData.endTime || new Date().toISOString(),
      durationSeconds: sessionData.durationSeconds || 0,
      dateFormatted: new Date().toLocaleDateString()
    };
    
    this.data.sessions.push(newSession);
    
    // Update game total playtime and last played date
    const game = this.getGameById(sessionData.gameId);
    if (game) {
      const addedMinutes = Math.round((sessionData.durationSeconds || 0) / 60);
      game.totalPlaytimeMinutes = (game.totalPlaytimeMinutes || 0) + addedMinutes;
      game.lastPlayed = newSession.endTime;
    }

    this.save();
    return newSession;
  }

  // Achievements CRUD
  getAchievements(gameId = null) {
    if (gameId) {
      return this.data.achievements.filter(a => a.gameId === gameId);
    }
    return this.data.achievements;
  }

  toggleAchievement(id, isUnlocked) {
    const ach = this.data.achievements.find(a => a.id === id);
    if (ach) {
      ach.isUnlocked = isUnlocked;
      ach.unlockedAt = isUnlocked ? new Date().toISOString() : null;
      this.save();
    }
    return ach;
  }

  // Settings CRUD
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }
}

module.exports = new DatabaseService();
