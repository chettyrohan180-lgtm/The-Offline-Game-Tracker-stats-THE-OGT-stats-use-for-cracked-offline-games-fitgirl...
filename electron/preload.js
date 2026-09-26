const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Games Data Bridge
  getGames: () => ipcRenderer.invoke('db:get-games'),
  saveGame: (gameData) => ipcRenderer.invoke('db:save-game', gameData),
  deleteGame: (id) => ipcRenderer.invoke('db:delete-game', id),
  toggleFavorite: (id) => ipcRenderer.invoke('db:toggle-favorite', id),

  // Game Launcher & Process Tracking Bridge
  launchGame: (gameId) => ipcRenderer.invoke('game:launch', gameId),
  stopGameSession: (gameId) => ipcRenderer.invoke('game:stop-session', gameId),
  getActiveSessions: () => ipcRenderer.invoke('game:get-active-sessions'),

  // Real-time Event Subscriptions
  onSessionStarted: (callback) => ipcRenderer.on('tracker:session-started', (e, data) => callback(data)),
  onSessionTick: (callback) => ipcRenderer.on('tracker:session-tick', (e, data) => callback(data)),
  onSessionStopped: (callback) => ipcRenderer.on('tracker:session-stopped', (e, data) => callback(data)),

  // PE Header & Icon Extractor Bridge
  parseExe: (filePath) => ipcRenderer.invoke('pe:parse-exe', filePath),

  // Playtime Sessions Bridge
  getSessions: (gameId) => ipcRenderer.invoke('db:get-sessions', gameId),
  addSession: (sessionData) => ipcRenderer.invoke('db:add-session', sessionData),

  // Achievements Bridge
  getAchievements: (gameId) => ipcRenderer.invoke('db:get-achievements', gameId),
  toggleAchievement: (id, isUnlocked) => ipcRenderer.invoke('db:toggle-achievement', { id, isUnlocked }),

  // Settings & App Info Bridge
  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('db:update-settings', settings),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  // Windows OS / Dialog Bridge
  selectGameExe: () => ipcRenderer.invoke('dialog:select-exe'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close')
});
