const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron');
const path = require('path');
const db = require('./db');
const PeParser = require('./peParser');
const IconExtractor = require('./iconExtractor');
const processWatcher = require('./processWatcher');

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    backgroundColor: '#0a0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const distPath = path.join(__dirname, '../dist/renderer/index.html');
    if (require('fs').existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../src/renderer/index.html'));
    }
  }

  // Initialize process watcher with main window instance
  processWatcher.init(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupTray() {
  try {
    tray = new Tray(path.join(__dirname, 'icon.png'));
    const contextMenu = Menu.buildFromTemplate([
      { label: 'OGT - Offline Game Tracker', enabled: false },
      { type: 'separator' },
      { label: 'Show Library', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { label: 'Exit OGT', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('OGT - Offline Game Tracker');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (e) {}
}

function registerIpcHandlers() {
  // DB Games
  ipcMain.handle('db:get-games', () => db.getGames());
  
  ipcMain.handle('db:save-game', async (event, gameData) => {
    if (gameData.exePath && (!gameData.coverImage || gameData.coverImage === '')) {
      const generatedIcon = await IconExtractor.extractIcon(gameData.exePath, gameData.id || `game-${Date.now()}`);
      gameData.coverImage = generatedIcon;
    }
    return db.saveGame(gameData);
  });

  ipcMain.handle('db:delete-game', (event, id) => db.deleteGame(id));
  ipcMain.handle('db:toggle-favorite', (event, id) => db.toggleFavorite(id));

  // Game Launcher & Process Watcher Channels
  ipcMain.handle('game:launch', (event, gameId) => processWatcher.launchGame(gameId));
  ipcMain.handle('game:stop-session', (event, gameId) => processWatcher.stopSession(gameId));
  ipcMain.handle('game:get-active-sessions', () => processWatcher.getActiveSessions());

  // PE Parsing & Icon Extractor
  ipcMain.handle('pe:parse-exe', async (event, filePath) => {
    const parsed = PeParser.parseExe(filePath);
    const icon = await IconExtractor.extractIcon(filePath, 'temp-' + Date.now());
    return { ...parsed, iconPath: icon };
  });

  // DB Sessions
  ipcMain.handle('db:get-sessions', (event, gameId) => db.getSessions(gameId));
  ipcMain.handle('db:add-session', (event, sessionData) => db.addSession(sessionData));

  // DB Achievements
  ipcMain.handle('db:get-achievements', (event, gameId) => db.getAchievements(gameId));
  ipcMain.handle('db:toggle-achievement', (event, { id, isUnlocked }) => db.toggleAchievement(id, isUnlocked));

  // DB Settings & Info
  ipcMain.handle('db:get-settings', () => db.getSettings());
  ipcMain.handle('db:update-settings', (event, settings) => db.updateSettings(settings));
  ipcMain.handle('app:get-version', () => app.getVersion());

  // Executable Picker Dialog
  ipcMain.handle('dialog:select-exe', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Game Executable (.EXE)',
      filters: [{ name: 'Executables', extensions: ['exe'] }],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      const parsed = PeParser.parseExe(selectedPath);
      const icon = await IconExtractor.extractIcon(selectedPath, 'game-' + Date.now());

      return {
        exePath: selectedPath,
        title: parsed.title,
        productName: parsed.productName,
        company: parsed.company,
        version: parsed.version,
        coverImage: icon
      };
    }
    return null;
  });

  // Window controls
  ipcMain.on('window:minimize', () => { if (mainWindow) mainWindow.minimize(); });
  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => {
    const settings = db.getSettings();
    if (settings.closeToTray && !app.isQuitting) {
      if (mainWindow) mainWindow.hide();
    } else {
      if (mainWindow) mainWindow.close();
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  setupTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  processWatcher.stopPolling();
  if (process.platform !== 'darwin') app.quit();
});
