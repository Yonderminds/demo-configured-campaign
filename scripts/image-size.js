/**
 * Pixel size of a raster image from its header, synchronously and without dependencies.
 * Supports PNG, JPEG, GIF, WebP (VP8, VP8L, VP8X). Returns { width, height } or null for
 * anything it cannot read (unknown format, truncated file, SVG). Used by optimize-site.js
 * to write width/height onto <img> tags in the built output.
 */
const fs = require('fs');

function imageSize(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const head = Buffer.alloc(32);
    const n = fs.readSync(fd, head, 0, 32, 0);
    if (n < 12) return null;

    // PNG: 8-byte signature, IHDR at offset 16 (width, height as big-endian uint32)
    if (head.readUInt32BE(0) === 0x89504e47 && n >= 24) {
      return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
    }
    // GIF: "GIF87a"/"GIF89a", logical screen width/height little-endian uint16 at 6 and 8
    if (head.toString('ascii', 0, 3) === 'GIF') {
      return { width: head.readUInt16LE(6), height: head.readUInt16LE(8) };
    }
    // WebP: RIFF....WEBP then a VP8 / VP8L / VP8X chunk
    if (head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = head.toString('ascii', 12, 16);
      if (chunk === 'VP8X' && n >= 30) {
        return { width: 1 + head.readUIntLE(24, 3), height: 1 + head.readUIntLE(27, 3) };
      }
      if (chunk === 'VP8L' && n >= 25) {
        const b = head.readUInt32LE(21);
        return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) };
      }
      if (chunk === 'VP8 ' && n >= 30) {
        return { width: head.readUInt16LE(26) & 0x3fff, height: head.readUInt16LE(28) & 0x3fff };
      }
      return null;
    }
    // JPEG: walk the segments to the first SOFn marker
    if (head[0] === 0xff && head[1] === 0xd8) {
      const size = fs.fstatSync(fd).size;
      const buf = Buffer.alloc(Math.min(size, 256 * 1024));
      fs.readSync(fd, buf, 0, buf.length, 0);
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) { i += 2; continue; }
        const len = buf.readUInt16BE(i + 2);
        const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSOF) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        if (marker === 0xda) break; // start of scan: no SOF found before image data
        i += 2 + len;
      }
      return null;
    }
    return null;
  } catch (err) {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

module.exports = { imageSize };
