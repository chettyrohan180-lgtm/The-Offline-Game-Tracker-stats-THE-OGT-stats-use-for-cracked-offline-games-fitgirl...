const fs = require('fs');
const path = require('path');
const db = require('./db');

/**
 * Offline Save File & Achievement Parser Engine
 * Handles Goldberg, CODEX, EMPRESS, ALI213, INI, and JSON save formats.
 */
class AchievementParser {
  /**
   * Scans save folder or custom path for a game and updates database
   * @param {string} gameId 
   * @returns {object} Scanned result with achievements list and completion percentage
   */
  static scanGameAchievements(gameId) {
    const game = db.getGameById(gameId);
    if (!game) return { achievements: [], completionPercentage: 0 };

    let searchPaths = [];
    if (game.customSavePath && fs.existsSync(game.customSavePath)) {
      searchPaths.push(game.customSavePath);
    } else {
      searchPaths = this.findAutoSavePaths(game);
    }

    let parsedAchievements = [];

    for (const targetPath of searchPaths) {
      const found = this.scanPathForAchievements(targetPath, gameId);
      if (found && found.length > 0) {
        parsedAchievements = found;
        break;
      }
    }

    // Fallback: If no external save files found, retrieve existing DB achievements or generate defaults
    if (parsedAchievements.length === 0) {
      parsedAchievements = db.getAchievements(gameId);
    }

    // Calculate Completion Percentage
    const totalCount = parsedAchievements.length;
    const unlockedCount = parsedAchievements.filter(a => a.isUnlocked).length;
    const completionPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    // Save completion percentage on game record
    db.saveGame({ id: gameId, completionPercentage });

    return {
      gameId,
      achievements: parsedAchievements,
      totalCount,
      unlockedCount,
      completionPercentage
    };
  }

  /**
   * Scans a specific folder path for achievement configuration files
   */
  static scanPathForAchievements(dirPath, gameId) {
    if (!fs.existsSync(dirPath)) return null;

    try {
      const stats = fs.statSync(dirPath);
      let targetDir = dirPath;
      if (!stats.isDirectory()) {
        targetDir = path.dirname(dirPath);
      }

      const files = fs.readdirSync(targetDir);

      // 1. Look for Goldberg achievements.json / achievements-json
      const goldbergJson = files.find(f => f.toLowerCase().includes('achievements') && f.endsWith('.json'));
      if (goldbergJson) {
        return this.parseGoldbergJson(path.join(targetDir, goldbergJson), gameId);
      }

      // 2. Look for CODEX / INI achievements.ini
      const iniFile = files.find(f => f.toLowerCase().includes('achievements') && f.endsWith('.ini'));
      if (iniFile) {
        return this.parseIniAchievements(path.join(targetDir, iniFile), gameId);
      }

    } catch (err) {
      console.warn(`[OGT Achievement Parser] Error scanning dir ${dirPath}:`, err.message);
    }

    return null;
  }

  /**
   * Parses Goldberg SteamEmu JSON format
   */
  static parseGoldbergJson(filePath, gameId) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      const list = [];

      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          list.push({
            id: `ach-${gameId}-${item.name || index}`,
            gameId,
            key: item.name || `ACH_${index}`,
            title: item.displayName || item.name || `Achievement ${index + 1}`,
            description: item.description || 'Offline achievement',
            isUnlocked: Boolean(item.earned || item.unlocked),
            unlockedAt: item.earnedTime ? new Date(item.earnedTime * 1000).toISOString() : (item.earned ? new Date().toISOString() : null)
          });
        });
      } else if (typeof data === 'object') {
        Object.entries(data).forEach(([key, val], index) => {
          list.push({
            id: `ach-${gameId}-${key}`,
            gameId,
            key,
            title: val.displayName || key,
            description: val.description || 'Offline achievement',
            isUnlocked: Boolean(val.earned || val.unlocked || val === 1),
            unlockedAt: val.earnedTime ? new Date(val.earnedTime * 1000).toISOString() : null
          });
        });
      }

      return list;
    } catch (e) {
      return null;
    }
  }

  /**
   * Parses CODEX / INI format
   */
  static parseIniAchievements(filePath, gameId) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const lines = raw.split('\n');
      const list = [];
      let currentSection = '';

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          currentSection = trimmed.slice(1, -1).toLowerCase();
          return;
        }

        if (trimmed.includes('=') && currentSection.includes('achievement')) {
          const [key, val] = trimmed.split('=').map(s => s.trim());
          const isUnlocked = val === '1' || val.toLowerCase() === 'true';
          list.push({
            id: `ach-${gameId}-${key}`,
            gameId,
            key,
            title: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description: `Unlocked in ${key}`,
            isUnlocked,
            unlockedAt: isUnlocked ? new Date().toISOString() : null
          });
        }
      });

      return list;
    } catch (e) {
      return null;
    }
  }

  /**
   * Discovers potential save locations on Windows
   */
  static findAutoSavePaths(game) {
    const paths = [];
    const appData = process.env.APPDATA || '';
    const localAppData = process.env.LOCALAPPDATA || '';
    const publicDocs = process.env.PUBLIC ? path.join(process.env.PUBLIC, 'Documents') : '';
    const userDocs = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'Documents') : '';

    if (game.exePath) {
      const gameDir = path.dirname(game.exePath);
      paths.push(path.join(gameDir, 'saves'));
      paths.push(path.join(gameDir, 'settings'));
    }

    if (appData) {
      paths.push(path.join(appData, 'Goldberg SteamEmu Saves'));
      paths.push(path.join(appData, 'Roaming', 'Steam', 'CODEX'));
    }

    if (publicDocs) {
      paths.push(path.join(publicDocs, 'EMPRESS'));
    }

    return paths;
  }
}

module.exports = AchievementParser;
