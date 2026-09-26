const fs = require('fs');
const path = require('path');
let app = null;
try {
  app = require('electron').app;
} catch (e) {}

class IconExtractor {
  static getIconsDir() {
    const userDataPath = (app && typeof app.getPath === 'function') ? app.getPath('userData') : path.join(process.cwd(), 'data');
    const iconsDir = path.join(userDataPath, 'icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }
    return iconsDir;
  }

  /**
   * Extracts or generates icon for executable
   * @param {string} exePath Absolute path to executable
   * @param {string} gameId Unique game identifier
   * @returns {Promise<string>} Image data URI or local file URL
   */
  static async extractIcon(exePath, gameId) {
    if (!exePath || !fs.existsSync(exePath)) {
      return this.generateDefaultBadge(gameId);
    }

    try {
      if (app && typeof app.getFileIcon === 'function') {
        // Native Electron Windows Shell icon extraction
        const nativeImg = await app.getFileIcon(exePath, { size: 'large' });
        if (nativeImg && !nativeImg.isEmpty()) {
          const pngBuffer = nativeImg.toPNG();
          const iconFileName = `${gameId || 'icon-' + Date.now()}.png`;
          const iconPath = path.join(this.getIconsDir(), iconFileName);
          fs.writeFileSync(iconPath, pngBuffer);
          return `file://${iconPath.replace(/\\/g, '/')}`;
        }
      }
    } catch (err) {
      console.warn(`[OGT Icon Extractor] Failed to extract native icon for ${exePath}:`, err.message);
    }

    return this.generateDefaultBadge(gameId);
  }

  /**
   * Generates a stylized SVG Data URI badge if icon extraction is unavailable
   */
  static generateDefaultBadge(title) {
    const cleanTitle = (title || 'OGT').trim();
    const initials = cleanTitle.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '🎮';
    
    // Pick deterministic gradient pair based on title char codes
    const gradients = [
      ['#6366f1', '#8b5cf6'],
      ['#00f2fe', '#4facfe'],
      ['#10b981', '#059669'],
      ['#f59e0b', '#d97706'],
      ['#ec4899', '#8b5cf6']
    ];
    const charSum = cleanTitle.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const [c1, c2] = gradients[charSum % gradients.length];

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${c2}" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="40" fill="url(#g)" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="-apple-system, sans-serif" font-weight="800" font-size="96">${initials}</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

module.exports = IconExtractor;
