// OGT Renderer Application Logic - Phase 2 Enhanced

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[OGT Renderer] Initializing application UI shell...');

  // State Management
  let gamesState = [];
  let sessionsState = [];
  let achievementsState = [];
  let activeView = 'dashboard';
  let libraryFilter = 'all';

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
        console.warn('[OGT Renderer] Running in standalone browser preview');
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
    const favClass = game.favorite ? 'active' : '';

    return `
      <div class="game-card" data-id="${game.id}">
        <div class="card-top-actions">
          <button class="card-action-btn favorite ${favClass}" data-id="${game.id}" title="Toggle Favorite">⭐</button>
          <button class="card-action-btn edit" data-id="${game.id}" title="Edit Game">⚙️</button>
        </div>
        <img class="game-cover" src="${cover}" alt="${game.title}" loading="lazy">
        <div class="game-details">
          <div class="game-title" title="${game.title}">${game.title}</div>
          <div class="game-meta">
            <span>${game.company || game.genre || 'Offline Game'}</span>
            <span class="game-playtime">${hours}h</span>
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
      grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 40px;">No games added yet. Drag & drop a .EXE file or click "+ Add Executable"!</div>`;
      return;
    }

    const recentGames = [...gamesState].slice(0, 4);
    grid.innerHTML = recentGames.map(createGameCardHTML).join('');
    bindCardEvents(grid);
  }

  function renderLibraryGrid() {
    const grid = document.getElementById('library-games-grid');
    if (!grid) return;

    let displayGames = [...gamesState];
    if (libraryFilter === 'favorites') {
      displayGames = displayGames.filter(g => g.favorite);
    }

    if (displayGames.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 40px;">No games match the current filter.</div>`;
      return;
    }

    grid.innerHTML = displayGames.map(createGameCardHTML).join('');
    bindCardEvents(grid);
  }

  function bindCardEvents(container) {
    // Launch button
    container.querySelectorAll('.launch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameId = btn.getAttribute('data-id');
        const game = gamesState.find(g => g.id === gameId);
        if (game) {
          alert(`Launching offline game:\n${game.title}\nPath: ${game.exePath}`);
        }
      });
    });

    // Favorite star button
    container.querySelectorAll('.card-action-btn.favorite').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const gameId = btn.getAttribute('data-id');
        if (window.electronAPI) {
          gamesState = await window.electronAPI.toggleFavorite(gameId);
        } else {
          const game = gamesState.find(g => g.id === gameId);
          if (game) game.favorite = !game.favorite;
        }
        renderAll();
      });
    });

    // Edit button
    container.querySelectorAll('.card-action-btn.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameId = btn.getAttribute('data-id');
        openEditModal(gameId);
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

  // Library Filter Buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      libraryFilter = btn.getAttribute('data-filter');
      renderLibraryGrid();
    });
  });

  // Add Game Modal Handlers
  const modalAddGame = document.getElementById('modal-add-game');
  const btnAddGame = document.getElementById('btn-add-game');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnBrowseExe = document.getElementById('btn-browse-exe');
  const formAddGame = document.getElementById('form-add-game');

  const inputExePath = document.getElementById('input-exe-path');
  const inputGameTitle = document.getElementById('input-game-title');
  const inputGameCompany = document.getElementById('input-game-company');
  const inputGameGenre = document.getElementById('input-game-genre');
  const inputGameCover = document.getElementById('input-game-cover');

  btnAddGame?.addEventListener('click', () => modalAddGame?.classList.add('active'));

  function closeAddModal() {
    modalAddGame?.classList.remove('active');
    formAddGame?.reset();
  }

  btnCloseModal?.addEventListener('click', closeAddModal);
  btnCancelModal?.addEventListener('click', closeAddModal);

  btnBrowseExe?.addEventListener('click', async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.selectGameExe();
      if (selected) {
        inputExePath.value = selected.exePath || '';
        inputGameTitle.value = selected.title || '';
        inputGameCompany.value = selected.company || '';
        if (selected.coverImage) inputGameCover.value = selected.coverImage;
      }
    }
  });

  formAddGame?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newGame = {
      exePath: inputExePath.value.trim(),
      title: inputGameTitle.value.trim(),
      company: inputGameCompany.value.trim() || 'Unknown Publisher',
      genre: inputGameGenre.value.trim() || 'Offline Game',
      coverImage: inputGameCover.value.trim() || ''
    };

    if (window.electronAPI) {
      gamesState = await window.electronAPI.saveGame(newGame);
    } else {
      newGame.id = `game-${Date.now()}`;
      gamesState.push(newGame);
    }

    closeAddModal();
    renderAll();
  });

  // Edit Game Modal Handlers
  const modalEditGame = document.getElementById('modal-edit-game');
  const formEditGame = document.getElementById('form-edit-game');
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');
  const btnDeleteGame = document.getElementById('btn-delete-game');

  const editId = document.getElementById('edit-game-id');
  const editTitle = document.getElementById('edit-game-title');
  const editCompany = document.getElementById('edit-game-company');
  const editGenre = document.getElementById('edit-game-genre');
  const editPath = document.getElementById('edit-game-path');
  const editCover = document.getElementById('edit-game-cover');

  function openEditModal(gameId) {
    const game = gamesState.find(g => g.id === gameId);
    if (!game) return;

    editId.value = game.id;
    editTitle.value = game.title;
    editCompany.value = game.company || '';
    editGenre.value = game.genre || '';
    editPath.value = game.exePath || '';
    editCover.value = game.coverImage || '';

    modalEditGame?.classList.add('active');
  }

  function closeEditModal() {
    modalEditGame?.classList.remove('active');
    formEditGame?.reset();
  }

  btnCloseEditModal?.addEventListener('click', closeEditModal);
  btnCancelEditModal?.addEventListener('click', closeEditModal);

  formEditGame?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      id: editId.value,
      title: editTitle.value.trim(),
      company: editCompany.value.trim(),
      genre: editGenre.value.trim(),
      exePath: editPath.value.trim(),
      coverImage: editCover.value.trim()
    };

    if (window.electronAPI) {
      gamesState = await window.electronAPI.saveGame(updated);
    } else {
      const idx = gamesState.findIndex(g => g.id === updated.id);
      if (idx >= 0) gamesState[idx] = { ...gamesState[idx], ...updated };
    }

    closeEditModal();
    renderAll();
  });

  btnDeleteGame?.addEventListener('click', async () => {
    const idToDelete = editId.value;
    if (!idToDelete) return;

    if (confirm('Are you sure you want to remove this game from your library?')) {
      if (window.electronAPI) {
        gamesState = await window.electronAPI.deleteGame(idToDelete);
      } else {
        gamesState = gamesState.filter(g => g.id !== idToDelete);
      }
      closeEditModal();
      renderAll();
    }
  });

  // Drag and Drop Executable Auto-Import
  const dropzoneOverlay = document.getElementById('dropzone-overlay');
  let dragCounter = 0;

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropzoneOverlay?.classList.add('active');
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropzoneOverlay?.classList.remove('active');
    }
  });

  window.addEventListener('dragover', (e) => e.preventDefault());

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropzoneOverlay?.classList.remove('active');

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      for (const file of e.dataTransfer.files) {
        if (file.name.toLowerCase().endsWith('.exe')) {
          console.log('[OGT Renderer] Auto-importing dropped executable:', file.path || file.name);
          let parsedMeta = { title: file.name.replace('.exe', ''), exePath: file.path };
          
          if (window.electronAPI) {
            parsedMeta = await window.electronAPI.parseExe(file.path);
          }

          const gameToSave = {
            exePath: file.path,
            title: parsedMeta.title || file.name.replace('.exe', ''),
            productName: parsedMeta.productName || '',
            company: parsedMeta.company || 'Unknown Publisher',
            coverImage: parsedMeta.iconPath || '',
            genre: 'Offline Game'
          };

          if (window.electronAPI) {
            gamesState = await window.electronAPI.saveGame(gameToSave);
          } else {
            gameToSave.id = `game-${Date.now()}`;
            gamesState.push(gameToSave);
          }
        }
      }
      renderAll();
    }
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
