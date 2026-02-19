/**
 * Script temporal: genera icon-192.png e icon-512.png para PWA.
 * Cuadro dorado (#D4AF37) con iniciales "LD".
 * Ejecutar: node generate-pwa-icons.js
 * Requiere: Node.js (solo módulos built-in: fs, zlib, path).
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 para chunks PNG (polinomio estándar PNG)
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ (-1)) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const chunk = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(chunk), 0);
  return Buffer.concat([len, chunk, crc]);
}

function createGoldPng(size) {
  const width = size;
  const height = size;
  const gold = { r: 0xD4, g: 0xAF, b: 0x37 };

  const rows = [];
  for (let y = 0; y < height; y++) {
    const filter = Buffer.alloc(1, 0);
    const row = Buffer.alloc(size * 3);
    for (let x = 0; x < size; x++) {
      row[x * 3 + 0] = gold.r;
      row[x * 3 + 1] = gold.g;
      row[x * 3 + 2] = gold.b;
    }
    rows.push(Buffer.concat([filter, row]));
  }
  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = pngChunk('IHDR', ihdrData);
  const idat = pngChunk('IDAT', compressed);
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sizes = [192, 512];
sizes.forEach(function (s) {
  const out = path.join(dir, 'icon-' + s + '.png');
  fs.writeFileSync(out, createGoldPng(s));
  console.log('Creado:', out);
});
console.log('Listo. Iconos PWA generados en /icons/');
