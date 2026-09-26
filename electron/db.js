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
        // Create initial default database with seed sample for first launch demo
        this.seedInitialData();
        this.save();
      }
    } catch (err) {
      console.error('[OGT DB] Error loading database, creating backup and reinitializing:', err);
      this.seedInitialData();
      this.save();
    }
  }

  seedInitialData() {
    const now = new Date().toISOString();
    this.data.games = [
      {
        id: 'game-demo-1',
        title: 'Cyberpunk 2077',
        exePath: 'C:\\Games\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe',
        productName: 'Cyberpunk 2077',
        company: 'CD PROJEKT RED',
        version: '2.12.0.0',
        iconPath: '',
        coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
        bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
        genre: 'Action RPG',
        launchParams: '',
        totalPlaytimeMinutes: 2840, // ~47.3 hrs
        lastPlayed: new Date(Date.now() - 3600000 * 5).toISOString(),
        favorite: true,
        createdAt: now
      },
      {
        id: 'game-demo-2',
        title: 'The Witcher 3: Wild Hunt',
        exePath: 'C:\\Games\\The Witcher 3\\bin\\x64\\witcher3.exe',
        productName: 'The Witcher 3: Wild Hunt',
        company: 'CD PROJEKT RED',
        version: '4.04.0.0',
        iconPath: '',
        coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
        bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
        genre: 'Open World RPG',
        launchParams: '',
        totalPlaytimeMinutes: 7420, // ~123.6 hrs
        lastPlayed: new Date(Date.now() - 3600000 * 48).toISOString(),
        favorite: true,
        createdAt: now
      },
      {
        id: 'game-demo-3',
        title: 'Hades II',
        exePath: 'C:\\Games\\Hades II\\Hades2.exe',
        productName: 'Hades II',
        company: 'Supergiant Games',
        version: '1.0.0.0',
        iconPath: '',
        coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
        bannerImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop',
        genre: 'Rogue-like Action',
        launchParams: '',
        totalPlaytimeMinutes: 1350, // ~22.5 hrs
        lastPlayed: new Date(Date.now() - 3600000 * 12).toISOString(),
        favorite: false,
        createdAt: now
      }
    ];

    this.data.sessions = [
      {
        id: 'sess-1',
        gameId: 'game-demo-1',
        startTime: new Date(Date.now() - 3600000 * 8).toISOString(),
        endTime: new Date(Date.now() - 3600000 * 5).toISOString(),
        durationSeconds: 10800, // 3 hrs
        dateFormatted: 'Today'
      },
      {
        id: 'sess-2',
        gameId: 'game-demo-3',
        startTime: new Date(Date.now() - 3600000 * 14).toISOString(),
        endTime: new Date(Date.now() - 3600000 * 12).toISOString(),
        durationSeconds: 7200, // 2 hrs
        dateFormatted: 'Yesterday'
      }
    ];

    this.data.achievements = [
      { id: 'ach-1', gameId: 'game-demo-1', key: 'CITY_LEGEND', title: 'The City Legend', description: 'Reach maximum Street Cred in Night City.', isUnlocked: true, unlockedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: 'ach-2', gameId: 'game-demo-1', key: 'FULL_CHROME', title: 'Full Cyberware', description: 'Install at least one implant in each body slot.', isUnlocked: true, unlockedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 'ach-3', gameId: 'game-demo-1', key: 'GUN_SLINGER', title: 'Gunslinger', description: 'Shoot down an incoming grenade with a revolver.', isUnlocked: false, unlockedAt: null },
      { id: 'ach-4', gameId: 'game-demo-2', key: 'KINGS_LAYER', title: 'Kingmaker', description: 'Complete the Skellige succession subplot.', isUnlocked: true, unlockedAt: new Date(Date.now() - 86400000 * 10).toISOString() },
      { id: 'ach-5', gameId: 'game-demo-2', key: 'MUTANT', title: 'Mutant', description: 'Fill all mutagen slots in the skills matrix.', isUnlocked: true, unlockedAt: new Date(Date.now() - 86400000 * 15).toISOString() }
    ];
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
