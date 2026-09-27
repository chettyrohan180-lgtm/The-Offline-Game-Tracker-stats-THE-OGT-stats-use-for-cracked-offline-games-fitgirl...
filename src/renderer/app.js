// OGT Renderer Application Logic - Phase 5 Hero View & Final UI Polish

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[OGT Renderer] Initializing application UI shell...');

  // State Management
  let gamesState = [];
  let sessionsState = [];
  let achievementsState = [];
  let activeSessionsState = [];
  let selectedAchGameId = null;
  let activeView = 'dashboard';
  let libraryFilter = 'all';

  // UI DOM Elements
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = {
    dashboard: document.getElementById('view-dashboard'),
    library: document.getElementById('view-library'),
    achievements: document.getElementById('view-achievements'),
    sessions: document.getElementById('view-sessions'),
    settings: document.getElementById('view-settings')
  };
  const viewTitle = document.getElementById('view-title');
  const viewSubtitle = document.getElementById('view-subtitle');

  // Live Session Banner Elements
  const activeSessionBanner = document.getElementById('active-session-banner');
  const activeGameTitle = document.getElementById('active-game-title');
  const activeGameCover = document.getElementById('active-game-cover');
  const activeGameTimer = document.getElementById('active-game-timer');
  const btnStopActiveSession = document.getElementById('btn-stop-active-session');

  // Window Controls
  const btnMin = document.getElementById('btn-min');
  const btnMax = document.getElementById('btn-max');
  const btnClose = document.getElementById('btn-close');

  if (window.electronAPI) {
    btnMin?.addEventListener('click', () => window.electronAPI.minimizeWindow());
    btnMax?.addEventListener('click', () => window.electronAPI.maximizeWindow());
    btnClose?.addEventListener('click', () => window.electronAPI.closeWindow());

    window.electronAPI.onSessionStarted((sessionData) => {
      updateActiveSessionUI(sessionData);
      renderAll();
    });

    window.electronAPI.onSessionTick((sessionData) => {
      updateActiveSessionUI(sessionData);
    });

    window.electronAPI.onSessionStopped(async (data) => {
      hideActiveSessionUI();
      await loadData();
    });
  }

  function formatHHMMSS(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hrs, mins, secs].map(v => v.toString().padStart(2, '0')).join(':');
  }

  function generateSVGBadge(title) {
    const cleanTitle = (title || 'OGT').trim();
    const initials = cleanTitle.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '🎮';
    const gradients = [
      ['#6366f1', '#8b5cf6'],
      ['#00f2fe', '#4facfe'],
      ['#10b981', '#059669'],
      ['#f59e0b', '#d97706'],
      ['#ec4899', '#8b5cf6']
    ];
    const charSum = cleanTitle.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const [c1, c2] = gradients[charSum % gradients.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}" /><stop offset="100%" stop-color="${c2}" /></linearGradient></defs><rect width="256" height="256" rx="40" fill="url(#g)" /><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="-apple-system,sans-serif" font-weight="800" font-size="96">${initials}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function updateActiveSessionUI(sessionData) {
    if (!sessionData) return;
    
    if (activeSessionBanner) activeSessionBanner.style.display = 'block';
    if (activeGameTitle) activeGameTitle.textContent = sessionData.title || 'Offline Game';
    if (activeGameCover) activeGameCover.src = sessionData.coverImage || generateSVGBadge(sessionData.title);
    if (activeGameTimer) activeGameTimer.textContent = formatHHMMSS(sessionData.durationSeconds || 0);

    if (btnStopActiveSession) {
      btnStopActiveSession.onclick = () => {
        if (window.electronAPI) window.electronAPI.stopGameSession(sessionData.gameId);
      };
    }
  }

  function hideActiveSessionUI() {
    if (activeSessionBanner) activeSessionBanner.style.display = 'none';
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
      achievements: 'Track offline game completion percentage and unlocked badges',
      sessions: 'History of game playtime logs and session durations',
      settings: 'Configure background tracking and application preferences'
    };

    if (viewTitle) viewTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
    if (viewSubtitle) viewSubtitle.textContent = subtitles[viewName] || '';

    if (viewName === 'achievements') {
      renderAchievementsView();
    }
  }

  // Load Data from Database IPC
  async function loadData() {
    try {
      if (window.electronAPI) {
        gamesState = await window.electronAPI.getGames();
        sessionsState = await window.electronAPI.getSessions();
        achievementsState = await window.electronAPI.getAchievements();
        activeSessionsState = await window.electronAPI.getActiveSessions();

        if (activeSessionsState.length > 0) {
          updateActiveSessionUI(activeSessionsState[0]);
        }
      }
      renderAll();
    } catch (err) {
      console.error('[OGT Renderer] Failed to load database state:', err);
    }
  }

  function renderAll() {
    renderStats();
    renderPlaytimeChart();
    renderDashboardGrid();
    renderLibraryGrid();
    renderSessionsList();
    renderAchievementsView();
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

  // Render Playtime Distribution Chart
  function renderPlaytimeChart() {
    const chartContainer = document.getElementById('dashboard-playtime-chart');
    if (!chartContainer) return;

    if (gamesState.length === 0) {
      chartContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">No playtime data available.</div>`;
      return;
    }

    const sortedGames = [...gamesState].sort((a, b) => (b.totalPlaytimeMinutes || 0) - (a.totalPlaytimeMinutes || 0)).slice(0, 4);
    const maxMins = Math.max(...sortedGames.map(g => g.totalPlaytimeMinutes || 0), 1);

    chartContainer.innerHTML = sortedGames.map(g => {
      const hours = ((g.totalPlaytimeMinutes || 0) / 60).toFixed(1);
      const percent = Math.max(5, Math.round(((g.totalPlaytimeMinutes || 0) / maxMins) * 100));

      return `
        <div class="chart-item">
          <span class="chart-label" title="${g.title}">${g.title}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${percent}%;"></div>
          </div>
          <span class="chart-value">${hours}h</span>
        </div>
      `;
    }).join('');
  }

  function createGameCardHTML(game) {
    const hours = ((game.totalPlaytimeMinutes || 0) / 60).toFixed(1);
    // Use extracted .exe icon, then SVG badge fallback — never an external URL
    const cover = (game.coverImage && !game.coverImage.startsWith('http'))
      ? game.coverImage
      : generateSVGBadge(game.title);
    const favClass = game.favorite ? 'active' : '';
    const completion = game.completionPercentage || 0;
    
    const isPlaying = activeSessionsState.some(s => s.gameId === game.id);
    const playingCardClass = isPlaying ? 'playing' : '';
    const launchBtnText = isPlaying ? 'Playing... (Click to Stop)' : 'Launch Game';
    const launchBtnClass = isPlaying ? 'launch-btn active' : 'launch-btn';

    return `
      <div class="game-card ${playingCardClass}" data-id="${game.id}">
        <div class="card-top-actions">
          <button class="card-action-btn favorite ${favClass}" data-id="${game.id}" title="Toggle Favorite">⭐</button>
          <button class="card-action-btn edit" data-id="${game.id}" title="Edit Game">⚙️</button>
        </div>
        <img class="game-cover" src="${cover}" alt="${game.title}" loading="lazy" onerror="this.src='${generateSVGBadge(game.title)}'">
        <div class="game-details">
          <div class="game-title" title="${game.title}">${game.title}</div>
          <div class="game-meta">
            <span>${game.company || game.genre || 'Offline Game'}</span>
            <span class="game-playtime">${hours}h</span>
          </div>
          <div style="font-size: 11px; color: var(--accent-emerald); font-weight: 700; margin-top: 2px;">
            ${completion}% Completed
          </div>
          <button class="${launchBtnClass}" data-id="${game.id}">${launchBtnText}</button>
        </div>
      </div>
    `;
  }

  const EMPTY_LIBRARY_HTML = `
    <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 16px;">
      <div style="font-size: 64px; filter: grayscale(0.3);">🎮</div>
      <div style="font-size: 20px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px;">Your Library is Empty</div>
      <div style="font-size: 14px; color: var(--text-muted); text-align: center; max-width: 380px; line-height: 1.6;">
        Click <strong style="color:var(--accent-violet)">+ Add Game</strong> or drag &amp; drop any <code style="background:rgba(255,255,255,0.07);padding:2px 6px;border-radius:4px;">.exe</code> file here to get started.
        OGT will auto-read the game name, version, and icon from the file.
      </div>
    </div>
  `;

  function renderDashboardGrid() {
    const grid = document.getElementById('dashboard-games-grid');
    if (!grid) return;

    if (gamesState.length === 0) {
      grid.innerHTML = EMPTY_LIBRARY_HTML;
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
      const msg = libraryFilter === 'favorites'
        ? `<div style="grid-column:1/-1;color:var(--text-muted);text-align:center;padding:40px;">No favourites yet — star a game to pin it here.</div>`
        : EMPTY_LIBRARY_HTML;
      grid.innerHTML = msg;
      return;
    }

    grid.innerHTML = displayGames.map(createGameCardHTML).join('');
    bindCardEvents(grid);
  }

  function bindCardEvents(container) {
    // Open Game Detail Hero View on Card Click
    container.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Ignore if clicking action buttons inside card
        if (e.target.closest('.card-top-actions') || e.target.closest('.launch-btn')) return;
        const gameId = card.getAttribute('data-id');
        openHeroModal(gameId);
      });
    });

    // Launch button
    container.querySelectorAll('.launch-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const gameId = btn.getAttribute('data-id');
        const isPlaying = activeSessionsState.some(s => s.gameId === gameId);
        
        if (isPlaying) {
          if (window.electronAPI) window.electronAPI.stopGameSession(gameId);
        } else {
          if (window.electronAPI) {
            await window.electronAPI.launchGame(gameId);
          }
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

    const sortedSessions = [...sessionsState].reverse();

    container.innerHTML = sortedSessions.map(s => {
      const game = gamesState.find(g => g.id === s.gameId);
      const title = game ? game.title : 'Offline Game';
      const mins = Math.max(1, Math.round((s.durationSeconds || 0) / 60));
      const secs = s.durationSeconds % 60;

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: rgba(255,255,255,0.03); border: 1px solid var(--bg-glass-border); border-radius: var(--border-radius-sm);">
          <div>
            <strong style="color: #fff; font-size: 15px;">${title}</strong>
            <span style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 2px;">Logged: ${s.dateFormatted || s.startTime}</span>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: var(--accent-cyan); font-family: var(--font-heading); font-size: 16px;">
              ${mins}m ${secs}s
            </div>
            <span style="font-size: 11px; color: var(--accent-emerald);">Verified Offline Session</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Hero Modal Handlers
  const modalGameDetail = document.getElementById('modal-game-detail');
  const btnCloseHeroModal = document.getElementById('btn-close-hero-modal');
  const heroBackdrop = document.getElementById('hero-backdrop-container');
  const heroTitle = document.getElementById('hero-game-title');
  const heroMeta = document.getElementById('hero-game-meta');
  const heroPlaytimeVal = document.getElementById('hero-playtime-val');
  const heroCompletionVal = document.getElementById('hero-completion-val');
  const heroLastPlayedVal = document.getElementById('hero-lastplayed-val');
  const heroBtnLaunch = document.getElementById('hero-btn-launch');
  const heroSessionsContainer = document.getElementById('hero-sessions-container');
  const heroAchievementsContainer = document.getElementById('hero-achievements-container');

  function openHeroModal(gameId) {
    const game = gamesState.find(g => g.id === gameId);
    if (!game) return;

    const coverForBanner = (game.bannerImage && !game.bannerImage.startsWith('http'))
      ? game.bannerImage
      : (game.coverImage && !game.coverImage.startsWith('http'))
        ? game.coverImage
        : null;
    if (heroBackdrop) {
      if (coverForBanner) {
        heroBackdrop.style.backgroundImage = `url('${coverForBanner}')`;
      } else {
        // No local image — use a gradient based on game title
        heroBackdrop.style.backgroundImage = generateSVGBadge(game.title)
          ? `url("${generateSVGBadge(game.title)}")`
          : 'none';
      }
    }
    if (heroTitle) heroTitle.textContent = game.title;
    if (heroMeta) heroMeta.textContent = `${game.company || 'Unknown Publisher'} • ${game.genre || 'Offline Game'}`;
    
    const hours = ((game.totalPlaytimeMinutes || 0) / 60).toFixed(1);
    if (heroPlaytimeVal) heroPlaytimeVal.textContent = `${hours}h`;
    if (heroCompletionVal) heroCompletionVal.textContent = `${game.completionPercentage || 0}%`;
    if (heroLastPlayedVal) heroLastPlayedVal.textContent = game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : 'Never';

    if (heroBtnLaunch) {
      heroBtnLaunch.onclick = async () => {
        if (window.electronAPI) await window.electronAPI.launchGame(game.id);
        modalGameDetail?.classList.remove('active');
      };
    }

    // Populate game specific sessions
    const gameSessions = sessionsState.filter(s => s.gameId === gameId).reverse();
    if (heroSessionsContainer) {
      if (gameSessions.length === 0) {
        heroSessionsContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px;">No logged sessions yet.</div>`;
      } else {
        heroSessionsContainer.innerHTML = gameSessions.map(s => `
          <div style="font-size: 12px; color: var(--text-muted); padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; display: flex; justify-content: space-between;">
            <span>${s.dateFormatted || 'Recently'}</span>
            <strong style="color: var(--accent-cyan);">${Math.max(1, Math.round((s.durationSeconds || 0) / 60))} mins</strong>
          </div>
        `).join('');
      }
    }

    // Populate game specific achievements
    const gameAchs = achievementsState.filter(a => a.gameId === gameId);
    if (heroAchievementsContainer) {
      if (gameAchs.length === 0) {
        heroAchievementsContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px;">No achievements scanned.</div>`;
      } else {
        heroAchievementsContainer.innerHTML = gameAchs.map(a => `
          <div style="font-size: 12px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: ${a.isUnlocked ? '#fff' : 'var(--text-muted)'};">${a.isUnlocked ? '🏆' : '🔒'} ${a.title || a.key}</span>
            <span style="color: ${a.isUnlocked ? 'var(--accent-emerald)' : 'var(--text-muted)'}; font-size: 11px;">${a.isUnlocked ? 'Unlocked' : 'Locked'}</span>
          </div>
        `).join('');
      }
    }

    modalGameDetail?.classList.add('active');
  }

  btnCloseHeroModal?.addEventListener('click', () => modalGameDetail?.classList.remove('active'));

  // Render Achievements View
  async function renderAchievementsView() {
    const selectEl = document.getElementById('ach-game-select');
    const titleBanner = document.getElementById('ach-game-title-banner');
    const percentText = document.getElementById('ach-percent-text');
    const progressFill = document.getElementById('ach-progress-fill');
    const countText = document.getElementById('ach-count-text');
    const grid = document.getElementById('achievements-grid');

    if (!selectEl || !grid) return;

    if (gamesState.length > 0) {
      selectEl.innerHTML = gamesState.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
      if (!selectedAchGameId || !gamesState.some(g => g.id === selectedAchGameId)) {
        selectedAchGameId = gamesState[0].id;
      }
      selectEl.value = selectedAchGameId;
    } else {
      selectEl.innerHTML = `<option value="">No Games Added</option>`;
      grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted); padding: 40px; text-align: center;">Add games to view achievements.</div>`;
      return;
    }

    const selectedGame = gamesState.find(g => g.id === selectedAchGameId);
    if (!selectedGame) return;

    if (titleBanner) titleBanner.textContent = `${selectedGame.title} Achievements`;

    let gameAchs = [];
    if (window.electronAPI) {
      gameAchs = await window.electronAPI.getAchievements(selectedAchGameId);
    } else {
      gameAchs = achievementsState.filter(a => a.gameId === selectedAchGameId);
    }

    const totalCount = gameAchs.length;
    const unlockedCount = gameAchs.filter(a => a.isUnlocked).length;
    const percent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    if (percentText) percentText.textContent = `${percent}%`;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (countText) countText.textContent = `${unlockedCount} / ${totalCount} Unlocked`;

    if (gameAchs.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted); padding: 40px; text-align: center;">No achievements found for this game. Click "Scan Save Files" to auto-detect Goldberg or INI saves.</div>`;
      return;
    }

    grid.innerHTML = gameAchs.map(a => {
      const cardClass = a.isUnlocked ? 'ach-card unlocked' : 'ach-card locked';
      const badgeIcon = a.isUnlocked ? '🏆' : '🔒';
      const dateText = a.isUnlocked ? (a.unlockedAt ? `Unlocked: ${new Date(a.unlockedAt).toLocaleDateString()}` : 'Unlocked') : 'Locked';
      const btnText = a.isUnlocked ? 'Mark Locked' : 'Mark Unlocked';

      return `
        <div class="${cardClass}">
          <div class="ach-icon-box">${badgeIcon}</div>
          <div class="ach-details">
            <div class="ach-title">${a.title || a.key}</div>
            <div class="ach-desc">${a.description || 'Offline achievement'}</div>
            <div class="ach-date">${dateText}</div>
            <button class="ach-toggle-btn" data-id="${a.id}" data-state="${a.isUnlocked}">${btnText}</button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.ach-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const achId = btn.getAttribute('data-id');
        const currentState = btn.getAttribute('data-state') === 'true';
        if (window.electronAPI) {
          await window.electronAPI.toggleAchievement(achId, !currentState);
          await loadData();
        }
      });
    });
  }

  // Theme Accent Customizer
  const themeAccentSelect = document.getElementById('setting-theme-accent');
  themeAccentSelect?.addEventListener('change', (e) => {
    const val = e.target.value;
    const colors = {
      indigo: '#6366f1',
      cyan: '#00f2fe',
      emerald: '#10b981',
      amber: '#f59e0b'
    };
    if (colors[val]) {
      document.documentElement.style.setProperty('--primary', colors[val]);
    }
  });

  // Game Selector Change Listener
  document.getElementById('ach-game-select')?.addEventListener('change', (e) => {
    selectedAchGameId = e.target.value;
    renderAchievementsView();
  });

  document.getElementById('btn-scan-achievements')?.addEventListener('click', async () => {
    if (!selectedAchGameId) return;
    if (window.electronAPI) {
      const scanRes = await window.electronAPI.scanAchievements(selectedAchGameId);
      alert(`Save Scan Complete!\nScanned: ${scanRes.totalCount} achievements\nCompletion: ${scanRes.completionPercentage}%`);
      await loadData();
    }
  });

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
  const btnBrowseSavePath = document.getElementById('btn-browse-save-path');

  const editId = document.getElementById('edit-game-id');
  const editTitle = document.getElementById('edit-game-title');
  const editCompany = document.getElementById('edit-game-company');
  const editGenre = document.getElementById('edit-game-genre');
  const editPath = document.getElementById('edit-game-path');
  const editSavePath = document.getElementById('edit-game-save-path');
  const editCover = document.getElementById('edit-game-cover');

  function openEditModal(gameId) {
    const game = gamesState.find(g => g.id === gameId);
    if (!game) return;

    editId.value = game.id;
    editTitle.value = game.title;
    editCompany.value = game.company || '';
    editGenre.value = game.genre || '';
    editPath.value = game.exePath || '';
    editSavePath.value = game.customSavePath || '';
    editCover.value = game.coverImage || '';

    modalEditGame?.classList.add('active');
  }

  function closeEditModal() {
    modalEditGame?.classList.remove('active');
    formEditGame?.reset();
  }

  btnCloseEditModal?.addEventListener('click', closeEditModal);
  btnCancelEditModal?.addEventListener('click', closeEditModal);

  btnBrowseSavePath?.addEventListener('click', async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.selectSaveFolder();
      if (folder) editSavePath.value = folder;
    }
  });

  formEditGame?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      id: editId.value,
      title: editTitle.value.trim(),
      company: editCompany.value.trim(),
      genre: editGenre.value.trim(),
      exePath: editPath.value.trim(),
      customSavePath: editSavePath.value.trim(),
      coverImage: editCover.value.trim()
    };

    if (window.electronAPI) {
      gamesState = await window.electronAPI.saveGame(updated);
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
