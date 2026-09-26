const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron');
const path = require('path');
const db = require('./db');

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Frameless window with custom glassmorphism titlebar
    backgroundColor: '#0a0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Determine if running in Vite dev mode or production build
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const distPath = path.join(__dirname, '../dist/renderer/index.html');
    if (require('fs').existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../src/renderer/index.html'));
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupTray() {
  try {
    // Create basic tray instance
    tray = new Tray(path.join(__dirname, 'icon.png')); // Fallback icon path handled gracefully
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
  } catch (e) {
    console.log('[OGT Tray] Tray initialized without custom icon PNG');
  }
}

function registerIpcHandlers() {
  // DB Games
  ipcMain.handle('db:get-games', () => db.getGames());
  ipcMain.handle('db:save-game', (event, gameData) => db.saveGame(gameData));
  ipcMain.handle('db:delete-game', (event, id) => db.deleteGame(id));

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

  // Dialogs
  ipcMain.handle('dialog:select-exe', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Game Executable (.EXE)',
      filters: [{ name: 'Executables', extensions: ['exe'] }],
      properties: ['openFile']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      const exeName = path.basename(selectedPath, '.exe');
      // Simple initial title formatting
      const formattedTitle = exeName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return {
        exePath: selectedPath,
        title: formattedTitle,
        productName: formattedTitle
      };
    }
    return null;
  });

  // Window controls
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });
  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
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
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
