// OGT Renderer Application Logic

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[OGT Renderer] Initializing application UI shell...');

  // State Management
  let gamesState = [];
  let sessionsState = [];
  let achievementsState = [];
  let activeView = 'dashboard';

  // UI DOM Elements
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = {
    dashboard: document.getElementById('view-dashboard'),
    library: document.getElementById('view-library'),
    sessions: document.getElementById('view-sessions'),
    settings: document.getElementById('view-settings')
  };
  const viewTitle = document.getElementById('view-title');
  const viewSubtitle = document.getElementById('view-subtitle');

  // Window Controls
  const btnMin = document.getElementById('btn-min');
  const btnMax = document.getElementById('btn-max');
  const btnClose = document.getElementById('btn-close');

  if (window.electronAPI) {
    btnMin?.addEventListener('click', () => window.electronAPI.minimizeWindow());
    btnMax?.addEventListener('click', () => window.electronAPI.maximizeWindow());
    btnClose?.addEventListener('click', () => window.electronAPI.closeWindow());
  }

  // Navigation Router
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      switchView(targetView);
    });
  });

  function switchView(viewName) {
    activeView = viewName;
    navItems.forEach(nav => {
      if (nav.getAttribute('data-view') === viewName) {
        nav.classList.add('active');
      } else {
        nav.classList.remove('active');
      }
    });

    Object.keys(viewPanels).forEach(key => {
      if (viewPanels[key]) {
        viewPanels[key].style.display = key === viewName ? 'block' : 'none';
      }
    });

    const subtitles = {
      dashboard: 'Overview of your offline gaming activity & stats',
      library: 'Manage and launch your imported game executables',
      sessions: 'History of game playtime logs and session durations',
      settings: 'Configure background tracking and application preferences'
    };

    if (viewTitle) viewTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
    if (viewSubtitle) viewSubtitle.textContent = subtitles[viewName] || '';
  }

  // Load Data from Database IPC
  async function loadData() {
    try {
      if (window.electronAPI) {
        gamesState = await window.electronAPI.getGames();
        sessionsState = await window.electronAPI.getSessions();
        achievementsState = await window.electronAPI.getAchievements();
      } else {
        console.warn('[OGT Renderer] Running in standalone browser preview without IPC bridge');
      }
      renderAll();
    } catch (err) {
      console.error('[OGT Renderer] Failed to load database state:', err);
    }
  }

  function renderAll() {
    renderStats();
    renderDashboardGrid();
    renderLibraryGrid();
    renderSessionsList();
  }

  function renderStats() {
    const totalGamesEl = document.getElementById('stat-total-games');
    const totalPlaytimeEl = document.getElementById('stat-total-playtime');
    const totalAchievementsEl = document.getElementById('stat-total-achievements');

    if (totalGamesEl) totalGamesEl.textContent = gamesState.length;

    const totalMinutes = gamesState.reduce((sum, g) => sum + (g.totalPlaytimeMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    if (totalPlaytimeEl) totalPlaytimeEl.textContent = `${totalHours}h`;

    const unlockedCount = achievementsState.filter(a => a.isUnlocked).length;
    if (totalAchievementsEl) totalAchievementsEl.textContent = unlockedCount;
  }

  function createGameCardHTML(game) {
    const hours = ((game.totalPlaytimeMinutes || 0) / 60).toFixed(1);
    const cover = game.coverImage || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop';
    
    return `
      <div class="game-card" data-id="${game.id}">
        <img class="game-cover" src="${cover}" alt="${game.title}" loading="lazy">
        <div class="game-details">
          <div class="game-title" title="${game.title}">${game.title}</div>
          <div class="game-meta">
            <span>${game.genre || 'Game'}</span>
            <span class="game-playtime">${hours}h played</span>
          </div>
          <button class="launch-btn" data-id="${game.id}">Launch Game</button>
        </div>
      </div>
    `;
  }

  function renderDashboardGrid() {
    const grid = document.getElementById('dashboard-games-grid');
    if (!grid) return;

    if (gamesState.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 40px;">No games added yet. Click "+ Add Executable" to start tracking!</div>`;
      return;
    }

    // Show recent top 4 games on dashboard
    const recentGames = [...gamesState].slice(0, 4);
    grid.innerHTML = recentGames.map(createGameCardHTML).join('');
    bindCardEvents(grid);
  }

  function renderLibraryGrid() {
    const grid = document.getElementById('library-games-grid');
    if (!grid) return;

    if (gamesState.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 40px;">Your game library is currently empty.</div>`;
      return;
    }

    grid.innerHTML = gamesState.map(createGameCardHTML).join('');
    bindCardEvents(grid);
  }

  function bindCardEvents(container) {
    container.querySelectorAll('.launch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameId = btn.getAttribute('data-id');
        const game = gamesState.find(g => g.id === gameId);
        if (game) {
          alert(`Simulating launch for: ${game.title}\nPath: ${game.exePath || 'Local executable'}`);
        }
      });
    });
  }

  function renderSessionsList() {
    const container = document.getElementById('sessions-list-container');
    if (!container) return;

    if (sessionsState.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); padding: 12px;">No sessions logged yet.</div>`;
      return;
    }

    container.innerHTML = sessionsState.map(s => {
      const game = gamesState.find(g => g.id === s.gameId);
      const title = game ? game.title : 'Offline Game';
      const mins = Math.round((s.durationSeconds || 0) / 60);
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--bg-glass-border); border-radius: var(--border-radius-sm);">
          <div>
            <strong style="color: #fff;">${title}</strong>
            <span style="font-size: 12px; color: var(--text-muted); display: block;">Logged: ${s.dateFormatted || 'Recently'}</span>
          </div>
          <div style="font-weight: 700; color: var(--accent-cyan); font-family: var(--font-heading);">
            ${mins} mins session
          </div>
        </div>
      `;
    }).join('');
  }

  // Modal Handlers
  const modalAddGame = document.getElementById('modal-add-game');
  const btnAddGame = document.getElementById('btn-add-game');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnBrowseExe = document.getElementById('btn-browse-exe');
  const formAddGame = document.getElementById('form-add-game');

  const inputExePath = document.getElementById('input-exe-path');
  const inputGameTitle = document.getElementById('input-game-title');
  const inputGameGenre = document.getElementById('input-game-genre');
  const inputGameCover = document.getElementById('input-game-cover');

  if (btnAddGame) {
    btnAddGame.addEventListener('click', () => {
      modalAddGame?.classList.add('active');
    });
  }

  function closeModal() {
    modalAddGame?.classList.remove('active');
    formAddGame?.reset();
  }

  btnCloseModal?.addEventListener('click', closeModal);
  btnCancelModal?.addEventListener('click', closeModal);

  btnBrowseExe?.addEventListener('click', async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.selectGameExe();
      if (selected) {
        inputExePath.value = selected.exePath || '';
        inputGameTitle.value = selected.title || '';
      }
    }
  });

  formAddGame?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newGame = {
      exePath: inputExePath.value.trim(),
      title: inputGameTitle.value.trim(),
      genre: inputGameGenre.value.trim() || 'Offline Game',
      coverImage: inputGameCover.value.trim() || ''
    };

    if (window.electronAPI) {
      gamesState = await window.electronAPI.saveGame(newGame);
    } else {
      newGame.id = `game-${Date.now()}`;
      gamesState.push(newGame);
    }

    closeModal();
    renderAll();
  });

  // Search Bar Filter
  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderAll();
      return;
    }
    const filtered = gamesState.filter(g => g.title.toLowerCase().includes(query) || (g.genre && g.genre.toLowerCase().includes(query)));
    const grid = document.getElementById('dashboard-games-grid');
    if (grid) {
      grid.innerHTML = filtered.map(createGameCardHTML).join('');
      bindCardEvents(grid);
    }
  });

  // Initial Data Fetch
  await loadData();
});
