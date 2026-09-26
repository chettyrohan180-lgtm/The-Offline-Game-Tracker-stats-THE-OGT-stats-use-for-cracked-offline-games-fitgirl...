# Phase 2 Plan: Game Library Management & PE Metadata Extractor

## Phase Objective
Implement the Windows PE executable metadata parsing engine, icon extractor, drag-and-drop import system, and interactive game library grid with search, filtering, favorite toggling, and metadata editing.

## Target Deliverables
1. `electron/peParser.js`: Windows PE resource header reader that extracts `ProductName`, `FileDescription`, `CompanyName`, and `FileVersion` directly from `.exe` binaries.
2. `electron/iconExtractor.js`: Icon extraction & caching utility that generates localized icon previews for imported executables.
3. Enhanced IPC Handlers (`electron/main.js`):
   - `pe:parse-exe`: Parses `.exe` path and returns extracted metadata + icon cache path.
   - `dialog:select-exe`: Opens file dialog, parses PE header, and returns structured game object.
4. Drag-and-Drop Import Target (`src/renderer/index.html` & `src/renderer/app.js`): Visual overlay when dragging `.exe` files over the application.
5. Interactive Game Library View:
   - Grid cards with cover image / icon, publisher, total playtime, favorite star toggle, and quick launch button.
   - Search bar filtering by title or genre.
   - Edit Game Modal with fields for Title, Genre, Publisher, Launch Params, Cover Image URL, Executable Path, and Delete option.

---

## Detailed Task Sequence

### Task 1: PE Metadata Reader Module (`electron/peParser.js`)
- Read PE binary structure (`IMAGE_DOS_HEADER` -> `e_lfanew` -> `IMAGE_NT_HEADERS` -> `Resource Directory`).
- Locate `VS_VERSION_INFO` resource structure to extract string table keys:
  - `ProductName`
  - `FileDescription`
  - `CompanyName`
  - `FileVersion`
  - `ProductVersion`
- Provide resilient fallback parser that converts raw executable filenames (e.g. `cyberpunk_2077_v2.12.exe`) into clean human-readable titles if string tables are absent.

### Task 2: Icon Extraction & Thumbnail Generator (`electron/iconExtractor.js`)
- Create icon caching directory under `userData/icons/`.
- Extract embedded `.ico` / group icon resource from PE binary or generate a stylized, color-coded game badge thumbnail.
- Save extracted icon image to local disk and return absolute file path.

### Task 3: Drag-and-Drop Handler & IPC Integration
- Update `electron/main.js` to register `pe:parse-exe` IPC channel.
- Implement HTML5 Drag-and-Drop events in renderer (`dragover`, `dragleave`, `drop`).
- Show dropzone overlay when files are dragged over the app window.
- Auto-import dropped `.exe` files and refresh the game library grid.

### Task 4: Library Grid, Filtering & Metadata Editing UI
- Build full Game Library view with:
  - Favorite star toggle filter ("All Games" vs "Favorites").
  - Live search input filtering across Title, Genre, and Publisher.
  - Action menu on game cards (Edit, Delete, Launch).
- Build Edit Game Modal (`#modal-edit-game`):
  - Form fields for Title, Genre, Publisher, Launch Parameters, Cover Image, and Executable Path.
  - Save changes handler updating database and refreshing library view.
  - Delete game handler with confirmation prompt.

---

## Verification Criteria
- [ ] Dragging a `.exe` file into OGT parses title, publisher, and version automatically.
- [ ] PE header metadata parser extracts valid Product Name and Company from Windows executables.
- [ ] Game cards display extracted icons/thumbnails, title, publisher, genre, and playtime.
- [ ] Favorite button toggles favorite state and saves to database.
- [ ] Editing game details in modal updates library view and persists to `ogt-database.json`.
- [ ] Deleting a game removes it cleanly from the library grid and database.
