const fs = require('fs');
const path = require('path');

/**
 * Windows PE Executable Metadata Parser
 * Reads PE headers and resource tables to extract ProductName, CompanyName, FileDescription, and FileVersion.
 */
class PeParser {
  /**
   * Main entry point to parse a .exe file
   * @param {string} filePath Absolute path to the .exe file
   * @returns {object} Extracted metadata
   */
  static parseExe(filePath) {
    const defaultTitle = this.cleanFileName(path.basename(filePath, '.exe'));
    const result = {
      title: defaultTitle,
      productName: defaultTitle,
      company: 'Unknown Publisher',
      version: '1.0.0.0',
      description: defaultTitle,
      exePath: filePath
    };

    if (!filePath || !fs.existsSync(filePath)) {
      return result;
    }

    try {
      const fd = fs.openSync(filePath, 'r');
      // Read first 1MB or full file if smaller
      const stats = fs.fstatSync(fd);
      const bufferSize = Math.min(stats.size, 1024 * 1024 * 4); // 4MB scan buffer
      const buffer = Buffer.alloc(bufferSize);
      fs.readSync(fd, buffer, 0, bufferSize, 0);
      fs.closeSync(fd);

      // Verify MZ Header
      if (buffer.readUInt16LE(0) !== 0x5A4D) { // 'MZ'
        return result;
      }

      // Scan for UTF-16LE StringTable entries in resource section
      const extracted = this.extractVersionStrings(buffer);
      if (extracted.productName) result.productName = extracted.productName;
      if (extracted.fileDescription) result.description = extracted.fileDescription;
      if (extracted.companyName) result.company = extracted.companyName;
      if (extracted.fileVersion) result.version = extracted.fileVersion;

      // Prefer ProductName > FileDescription > Cleaned Filename
      if (result.productName && result.productName.trim().length > 1) {
        result.title = result.productName.trim();
      } else if (result.description && result.description.trim().length > 1) {
        result.title = result.description.trim();
      }

    } catch (err) {
      console.warn(`[OGT PE Parser] Error parsing PE header for ${filePath}:`, err.message);
    }

    return result;
  }

  /**
   * Scans buffer for UTF-16LE version strings in VS_VERSIONINFO table
   */
  static extractVersionStrings(buffer) {
    const keys = {
      productName: 'ProductName',
      companyName: 'CompanyName',
      fileDescription: 'FileDescription',
      fileVersion: 'FileVersion'
    };

    const found = {};

    for (const [prop, keyName] of Object.entries(keys)) {
      // Convert key to UTF-16LE Buffer search pattern
      const keyBuffer = Buffer.from(keyName, 'utf16le');
      const index = buffer.indexOf(keyBuffer);

      if (index !== -1) {
        // Skip key string + null terminator
        const valueStart = index + keyBuffer.length + 2;
        // Search for double null terminator (0x00 0x00) marking end of UTF-16 string
        let valueEnd = valueStart;
        while (valueEnd < buffer.length - 2) {
          if (buffer.readUInt16LE(valueEnd) === 0x0000) {
            break;
          }
          valueEnd += 2;
        }

        if (valueEnd > valueStart) {
          const rawVal = buffer.toString('utf16le', valueStart, valueEnd).trim();
          // Filter out garbage characters or control symbols
          const cleaned = rawVal.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          if (cleaned.length > 0) {
            found[prop] = cleaned;
          }
        }
      }
    }

    return found;
  }

  /**
   * Clean executable filename into human-readable title fallback
   * e.g. "cyberpunk_2077_v2.12" -> "Cyberpunk 2077 V2 12"
   */
  static cleanFileName(filename) {
    return filename
      .replace(/[-_]/g, ' ')
      .replace(/\b(setup|launcher|x64|x86|win64|win32|final|release|v\d+.*)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}

module.exports = PeParser;
