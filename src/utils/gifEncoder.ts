/**
 * Lightweight, robust client-side GIF89a encoder in pure TypeScript.
 * Encodes an array of HTMLCanvasElement or ImageData frames into an animated GIF Blob.
 */

// LZW compression dictionary size
const MAX_BITS = 12;
const BITS_INIT = 9;

class ByteOutput {
  private buffer: Uint8Array;
  private pointer: number = 0;

  constructor(initialSize = 1024 * 1024) {
    this.buffer = new Uint8Array(initialSize);
  }

  ensureCapacity(extra: number) {
    if (this.pointer + extra > this.buffer.length) {
      const next = new Uint8Array(Math.max(this.buffer.length * 2, this.pointer + extra + 65536));
      next.set(this.buffer);
      this.buffer = next;
    }
  }

  writeByte(val: number) {
    this.ensureCapacity(1);
    this.buffer[this.pointer++] = val & 0xff;
  }

  writeBytes(arr: number[] | Uint8Array) {
    this.ensureCapacity(arr.length);
    for (let i = 0; i < arr.length; i++) {
      this.buffer[this.pointer++] = arr[i] & 0xff;
    }
  }

  writeUTF(str: string) {
    for (let i = 0; i < str.length; i++) {
      this.writeByte(str.charCodeAt(i));
    }
  }

  getBlob(): Blob {
    return new Blob([this.buffer.slice(0, this.pointer)], { type: 'image/gif' });
  }

  getBytes(): Uint8Array {
    return this.buffer.subarray(0, this.pointer);
  }
}

// Simple color quantizer: builds a 256-color palette using popularity / spatial color quantization
function quantizeFrame(rgba: Uint8ClampedArray, width: number, height: number): {
  palette: number[]; // Flat array of [r, g, b, r, g, b, ...] length 256*3
  indexedPixels: Uint8Array;
} {
  const pixelCount = width * height;
  const indexedPixels = new Uint8Array(pixelCount);

  // Sample colors to create a representative 256-color palette
  // 5-bit color bucketing (32x32x32 = 32768 cells)
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();
  const step = Math.max(1, Math.floor(pixelCount / 15000)); // Sample up to 15k pixels for palette

  for (let i = 0; i < pixelCount; i += step) {
    const idx = i * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count++;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  // Sort by popularity and select up to 256 colors
  const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  const colorList: [number, number, number][] = [];

  // Always reserve black and pure bright white/neon
  colorList.push([5, 5, 10]); // near black
  colorList.push([255, 255, 255]); // white

  for (let i = 0; i < sorted.length && colorList.length < 256; i++) {
    const item = sorted[i];
    colorList.push([
      Math.round(item.r / item.count),
      Math.round(item.g / item.count),
      Math.round(item.b / item.count),
    ]);
  }

  // Pad to 256 if needed
  while (colorList.length < 256) {
    colorList.push([0, 0, 0]);
  }

  // Flatten palette
  const palette: number[] = [];
  for (let i = 0; i < 256; i++) {
    palette.push(colorList[i][0], colorList[i][1], colorList[i][2]);
  }

  // Map each pixel to closest color in palette using Euclidean distance
  // Cache recent color lookups for high performance
  const lookupCache = new Map<number, number>();

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];
    const cacheKey = (r << 16) | (g << 8) | b;

    const cached = lookupCache.get(cacheKey);
    if (cached !== undefined) {
      indexedPixels[i] = cached;
      continue;
    }

    let bestDist = Infinity;
    let bestIdx = 0;

    for (let c = 0; c < 256; c++) {
      const pr = palette[c * 3];
      const pg = palette[c * 3 + 1];
      const pb = palette[c * 3 + 2];
      const dr = r - pr;
      const dg = g - pg;
      const db = b - pb;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = c;
        if (dist === 0) break;
      }
    }

    lookupCache.set(cacheKey, bestIdx);
    indexedPixels[i] = bestIdx;
  }

  return { palette, indexedPixels };
}

// LZW compressor for standard GIF89a raster data
function writeLZW(out: ByteOutput, indexedPixels: Uint8Array, colorDepth: number) {
  const initCodeSize = Math.max(2, colorDepth);
  out.writeByte(initCodeSize);

  const clearCode = 1 << initCodeSize;
  const eoiCode = clearCode + 1;

  let codeSize = initCodeSize + 1;
  let maxCode = (1 << codeSize) - 1;

  // LZW hash table
  const table = new Map<number, number>();

  function resetTable() {
    table.clear();
    for (let i = 0; i < clearCode + 2; i++) {
      table.set(i, i);
    }
    codeSize = initCodeSize + 1;
    maxCode = (1 << codeSize) - 1;
  }

  let curAccum = 0;
  let curBits = 0;
  const block: number[] = [];

  function flushPacket() {
    if (block.length > 0) {
      out.writeByte(block.length);
      out.writeBytes(block);
      block.length = 0;
    }
  }

  function emitCode(code: number) {
    curAccum |= code << curBits;
    curBits += codeSize;

    while (curBits >= 8) {
      block.push(curAccum & 0xff);
      if (block.length >= 254) {
        flushPacket();
      }
      curAccum >>= 8;
      curBits -= 8;
    }
  }

  function flushBits() {
    while (curBits > 0) {
      block.push(curAccum & 0xff);
      if (block.length >= 254) {
        flushPacket();
      }
      curAccum >>= 8;
      curBits -= 8;
    }
    flushPacket();
    out.writeByte(0); // Zero length block terminates stream
  }

  resetTable();
  emitCode(clearCode);

  let nextAvailableCode = eoiCode + 1;
  let prefix = indexedPixels[0];

  for (let i = 1; i < indexedPixels.length; i++) {
    const k = indexedPixels[i];
    const key = (prefix << 8) | k;

    if (table.has(key)) {
      prefix = table.get(key)!;
    } else {
      emitCode(prefix);

      if (nextAvailableCode <= (1 << MAX_BITS) - 1) {
        table.set(key, nextAvailableCode++);
        if (nextAvailableCode > maxCode && codeSize < MAX_BITS) {
          codeSize++;
          maxCode = (1 << codeSize) - 1;
        }
      } else {
        emitCode(clearCode);
        resetTable();
        nextAvailableCode = eoiCode + 1;
      }
      prefix = k;
    }
  }

  emitCode(prefix);
  emitCode(eoiCode);
  flushBits();
}

export interface GifFrameOptions {
  delayMs?: number; // Delay in milliseconds (e.g. 50 = 20 fps, 100 = 10 fps)
}

export async function createGifBlob(
  canvasFrames: HTMLCanvasElement[],
  delayMs = 60,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  if (canvasFrames.length === 0) {
    throw new Error('No frames provided');
  }

  const width = canvasFrames[0].width;
  const height = canvasFrames[0].height;
  const delay100ths = Math.max(2, Math.round(delayMs / 10)); // GIF delay in hundredths of a second

  const out = new ByteOutput();

  // 1. Header
  out.writeUTF('GIF89a');

  // 2. Logical Screen Descriptor
  out.writeByte(width & 0xff);
  out.writeByte((width >> 8) & 0xff);
  out.writeByte(height & 0xff);
  out.writeByte((height >> 8) & 0xff);

  // Global Color Table Flag: false (we use local color tables per frame for best visual quality)
  // Color resolution: 8 bits, Sort Flag: 0, Global color table size: 0
  out.writeByte(0x70); // 0b01110000
  out.writeByte(0); // Background Color Index
  out.writeByte(0); // Pixel Aspect Ratio

  // 3. Netscape 2.0 Loop Extension (Infinite repeat)
  out.writeByte(0x21); // Extension Introducer
  out.writeByte(0xff); // Application Extension Label
  out.writeByte(11); // Block Size
  out.writeUTF('NETSCAPE2.0');
  out.writeByte(3); // Sub-block size
  out.writeByte(1); // Sub-block ID
  out.writeByte(0); // Loop count (0 = infinite)
  out.writeByte(0);
  out.writeByte(0); // Block Terminator

  // 4. Frames
  for (let f = 0; f < canvasFrames.length; f++) {
    const frameCanvas = canvasFrames[f];
    const ctx = frameCanvas.getContext('2d');
    if (!ctx) continue;
    const imgData = ctx.getImageData(0, 0, width, height);

    const { palette, indexedPixels } = quantizeFrame(imgData.data, width, height);

    // Graphic Control Extension (Timing & Disposal)
    out.writeByte(0x21); // Extension Introducer
    out.writeByte(0xf9); // Graphic Control Label
    out.writeByte(4); // Block Size
    out.writeByte(0x04); // Disposal method 1 (do not dispose), user input flag 0, transparent color 0
    out.writeByte(delay100ths & 0xff); // Delay low byte
    out.writeByte((delay100ths >> 8) & 0xff); // Delay high byte
    out.writeByte(0); // Transparent color index
    out.writeByte(0); // Block Terminator

    // Image Descriptor
    out.writeByte(0x2c); // Image Separator ','
    out.writeByte(0); // Left 0
    out.writeByte(0);
    out.writeByte(0); // Top 0
    out.writeByte(0);
    out.writeByte(width & 0xff); // Width
    out.writeByte((width >> 8) & 0xff);
    out.writeByte(height & 0xff); // Height
    out.writeByte((height >> 8) & 0xff);

    // Local Color Table Flag: true (1), Interlace: 0, Sort: 0, Size: 2^(7+1) = 256 colors
    out.writeByte(0x87); // 0b10000111

    // Write Local Color Table (256 * 3 = 768 bytes)
    out.writeBytes(palette);

    // Write Raster Data via LZW
    writeLZW(out, indexedPixels, 8);

    if (onProgress) {
      onProgress(Math.round(((f + 1) / canvasFrames.length) * 100));
    }

    // Yield to keep UI responsive
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // 5. Trailer
  out.writeByte(0x3b); // GIF Trailer ';'

  return out.getBlob();
}
