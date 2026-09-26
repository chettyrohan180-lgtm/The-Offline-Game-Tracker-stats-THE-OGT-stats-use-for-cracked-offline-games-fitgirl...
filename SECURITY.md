# Security & Privacy Audit — OGT (Offline Game Tracker)

> Full security review of the OGT codebase. Last updated: September 2026.

---

## ✅ What We Got Right

### 1. Electron Secure Defaults
| Setting | Value | What it means |
|---|---|---|
| `nodeIntegration` | `false` | Renderer (UI) cannot call Node.js directly |
| `contextIsolation` | `true` | Renderer runs in isolated JS context — no access to Electron internals |
| `sandbox` | `false` | Required for preload IPC bridge to work correctly |
| `contextBridge` | ✅ Used | Only explicitly whitelisted APIs are exposed to the renderer |

**Bottom line:** The UI can only do what `preload.js` explicitly allows. Nothing more.

---

### 2. IPC Channel Whitelist (`preload.js`)
All channels are explicitly named and individually exposed:
```
db:get-games, db:save-game, db:delete-game, db:toggle-favorite
game:launch, game:stop-session, game:get-active-sessions
pe:parse-exe, db:get-achievements, achievements:scan ...
```
The renderer **cannot** send arbitrary IPC channels or access the filesystem directly.

---

### 3. Atomic Database Writes (`db.js`)
Writes use a **write-temp-then-rename** pattern:
```js
fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
fs.renameSync(tempPath, this.dbFilePath);  // Atomic swap
```
This means:
- ✅ No partial/corrupt writes if the app crashes mid-save
- ✅ The database is always in a valid state

---

### 4. Zero Network Activity
- No `fetch()`, `axios`, `https`, or `http` calls anywhere in the backend
- No telemetry, analytics, or crash reporting libraries
- No API keys or secrets stored anywhere
- `.env` files are gitignored by default

---

### 5. Process Execution is Controlled
The `launchGame()` function only:
1. Reads `exePath` from the **database** (user-registered paths only)
2. Checks `fs.existsSync(game.exePath)` before spawning
3. Uses `child_process.spawn` with `detached: true` + `stdio: 'ignore'`

The renderer **cannot** trigger arbitrary process execution — it can only pass a `gameId`, and the main process resolves the path from the trusted DB.

---

### 6. `tasklist` Usage (Process Watcher)
```js
exec('tasklist /FO CSV /NH', ...)
```
- ✅ No arguments from user input injected into this command
- ✅ Output is parsed only for `name` and `pid` fields
- ✅ Matched against game exe filenames from the local DB only
- ✅ No shell injection possible (hardcoded command, no dynamic args)

---

### 7. gitignore Protects User Data
```
data/           # Local database — never committed
.env*           # Environment files
.planning/      # Internal workflow docs
*.json.tmp      # Temp write files
node_modules/   # Dependencies
```

---

## ⚠️ Known Limitations / Minor Risks

### 1. Demo Cover Images Use Unsplash URLs
**Issue:** The seeded demo games use `https://images.unsplash.com/...` URLs for cover art.  
**Impact:** When those demo games are visible, Electron's renderer makes outbound HTTP requests to Unsplash to load the images.  
**Risk Level:** 🟡 Low — Unsplash is a legitimate public CDN, no data is sent, only image fetches.  
**Fix:** Replace demo image URLs with local files, or add a Content Security Policy to restrict image sources.

### 2. No Input Validation on `saveGame()` / `addSession()`
**Issue:** The `db.saveGame(gameData)` function accepts raw objects from the renderer and spreads them directly:
```js
this.data.games[existingIndex] = { ...this.data.games[existingIndex], ...gameData, updatedAt: ... };
```
**Impact:** A rogue renderer script could inject unexpected keys into game records (e.g., `__proto__` pollution — though JS `JSON.parse` mitigates most prototype pollution).  
**Risk Level:** 🟡 Low — Since the renderer is your own code and `contextIsolation` is on, this is only a concern if someone injects a malicious script into the renderer (e.g., via a malicious save file path).  
**Recommended Fix:**
```js
// Whitelist only known fields before saving:
const allowedFields = ['id','title','exePath','genre','launchParams','coverImage','favorite','customSavePath'];
const sanitized = Object.fromEntries(Object.entries(gameData).filter(([k]) => allowedFields.includes(k)));
```

### 3. Achievement Parser Reads Arbitrary File Paths
**Issue:** `scanGameAchievements()` reads files from `game.customSavePath` if set by the user:
```js
if (game.customSavePath && fs.existsSync(game.customSavePath)) {
  searchPaths.push(game.customSavePath);
}
```
**Impact:** A user could technically point this at any JSON/INI file on their system. Since this is a local desktop app and the user is the operator, this is by design.  
**Risk Level:** 🟢 None for single-user desktop use. Would be a concern in a multi-user or networked context.

### 4. `launchParams` Passed to `spawn()` Without Sanitization
**Issue:**
```js
game.launchParams.split(' ')  // Passed as args array to spawn()
```
**Impact:** If `launchParams` contains something like `--flag=../../malicious`, it's passed to the game binary as-is.  
**Risk Level:** 🟢 Low — The game binary itself controls what args it accepts. This only affects the game process, not OGT.

### 5. `sandbox: false` in BrowserWindow
**Issue:** `sandbox: false` is required for the preload script to access Node APIs via `contextBridge`. This is the standard Electron pattern.  
**Impact:** If the renderer is ever compromised (XSS from a loaded URL), the preload APIs would be accessible.  
**Risk Level:** 🟢 Very Low — The app loads from `localhost:5173` in dev and a local `file://` in prod. There are no external URLs loaded into the main window.

---

## 🔴 What We Do NOT Do (Privacy Guarantees)

| What | Status |
|---|---|
| Send game data to any server | ❌ Never |
| Track which games you play | ❌ Only stored locally |
| Collect system info / hardware IDs | ❌ Never |
| Use cookies or localStorage for tracking | ❌ Never |
| Phone home on startup | ❌ Never |
| Store passwords or credentials | ❌ Never (none needed) |
| Log keystrokes or clipboard | ❌ Never |

---

## 📋 Recommended Hardening (Future)

1. **Add a Content Security Policy (CSP)** to block external image loading:
   ```js
   // In main.js after createWindow()
   mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
     callback({
       responseHeaders: {
         ...details.responseHeaders,
         'Content-Security-Policy': ["default-src 'self'; img-src 'self' data: blob:"]
       }
     });
   });
   ```

2. **Input whitelist on `db.saveGame()`** — filter allowed fields before saving.

3. **Replace Unsplash demo images with local bundled assets** to be 100% offline.

4. **Consider encrypting the database** if the app is used in a shared/family PC context (use `safeStorage` from Electron).

---

## Summary Score

| Category | Rating | Notes |
|---|---|---|
| Electron IPC Security | ✅ Strong | contextBridge, contextIsolation, no nodeIntegration |
| Data Privacy | ✅ Excellent | 100% local, zero network for core functionality |
| Database Integrity | ✅ Good | Atomic writes prevent corruption |
| Input Validation | 🟡 Fair | No whitelist on game object fields |
| Process Execution | ✅ Good | Controlled paths, no arbitrary execution |
| Network Exposure | 🟡 Minor | Demo images use Unsplash CDN |
| Code Injection Risk | ✅ Very Low | No eval(), no innerHTML with user content |
| **Overall** | **✅ Safe for personal use** | No serious vulnerabilities found |
