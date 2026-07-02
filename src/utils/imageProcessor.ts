import PicaLib from 'pica';
import type { OutputFormat } from '../types';

type PicaInstance = {
  resize: (from: HTMLCanvasElement, to: HTMLCanvasElement, options?: object) => Promise<HTMLCanvasElement>;
  toBlob: (canvas: HTMLCanvasElement, mimeType: string, quality?: number) => Promise<Blob>;
};

const PicaCtor = PicaLib as unknown as new () => PicaInstance;
const pica: PicaInstance = new PicaCtor();

const LONG_SIDE_MIN = 3000;

async function getExifOrientation(file: File): Promise<number> {
  try {
    // Read first 64KB to find EXIF
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const view = new DataView(buffer);

    if (view.getUint16(0) !== 0xffd8) return 1; // Not JPEG

    let offset = 2;
    while (offset < buffer.byteLength - 2) {
      const marker = view.getUint16(offset);
      offset += 2;
      if (marker === 0xffe1) {
        // APP1 marker
        const length = view.getUint16(offset);
        const exifHeader = new Uint8Array(buffer, offset + 2, 4);
        if (
          exifHeader[0] === 0x45 &&
          exifHeader[1] === 0x78 &&
          exifHeader[2] === 0x69 &&
          exifHeader[3] === 0x66
        ) {
          // "Exif"
          const tiffOffset = offset + 8;
          const littleEndian =
            view.getUint16(tiffOffset) === 0x4949;
          const ifdOffset =
            view.getUint32(tiffOffset + 4, littleEndian);
          const entries = view.getUint16(
            tiffOffset + ifdOffset,
            littleEndian,
          );
          for (let i = 0; i < entries; i++) {
            const entryOffset =
              tiffOffset + ifdOffset + 2 + i * 12;
            if (
              view.getUint16(entryOffset, littleEndian) === 0x0112
            ) {
              return view.getUint16(entryOffset + 8, littleEndian);
            }
          }
        }
        offset += length;
      } else if ((marker & 0xff00) === 0xff00) {
        offset += view.getUint16(offset);
      } else {
        break;
      }
    }
  } catch {
    // ignore
  }
  return 1;
}

function applyOrientationToCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  orientation: number,
): { width: number; height: number } {
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  if (orientation >= 5) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.save();
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, w, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, w, h);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, h);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, h, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, h, w);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, w);
      break;
    default:
      break;
  }
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  return {
    width: canvas.width,
    height: canvas.height,
  };
}

function applySharpening(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  // Subtle unsharp mask using convolution
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const w = width;
  const h = height;

  // Simple 3x3 sharpen kernel (subtle)
  // [0,-0.5,0, -0.5,3,-0.5, 0,-0.5,0] normalized
  const kernel = [0, -0.3, 0, -0.3, 2.2, -0.3, 0, -0.3, 0];
  const kSize = 3;
  const kHalf = 1;

  const output = new Uint8ClampedArray(data.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const px = Math.min(Math.max(x + kx - kHalf, 0), w - 1);
          const py = Math.min(Math.max(y + ky - kHalf, 0), h - 1);
          const idx = (py * w + px) * 4;
          const kVal = kernel[ky * kSize + kx];
          r += data[idx] * kVal;
          g += data[idx + 1] * kVal;
          b += data[idx + 2] * kVal;
        }
      }
      const outIdx = (y * w + x) * 4;
      output[outIdx] = Math.min(Math.max(r, 0), 255);
      output[outIdx + 1] = Math.min(Math.max(g, 0), 255);
      output[outIdx + 2] = Math.min(Math.max(b, 0), 255);
      output[outIdx + 3] = data[outIdx + 3];
    }
  }

  ctx.putImageData(new ImageData(output, w, h), 0, 0);
}

export interface ProcessResult {
  blob: Blob;
  outputWidth: number;
  outputHeight: number;
  originalWidth: number;
  originalHeight: number;
}

export async function processImage(
  file: File,
  format: OutputFormat,
  onProgress?: (pct: number) => void,
): Promise<ProcessResult> {
  onProgress?.(5);

  // Load image
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });

  onProgress?.(20);

  // Apply EXIF orientation
  const orientation = await getExifOrientation(file);
  const srcCanvas = document.createElement('canvas');
  const srcCtx = srcCanvas.getContext('2d')!;
  const { width: srcW, height: srcH } = applyOrientationToCanvas(
    srcCanvas,
    srcCtx,
    img,
    orientation,
  );
  URL.revokeObjectURL(url);

  onProgress?.(35);

  const originalWidth = srcW;
  const originalHeight = srcH;

  // Compute target size
  const longSide = Math.max(srcW, srcH);
  let targetW = srcW;
  let targetH = srcH;

  if (longSide < LONG_SIDE_MIN) {
    const scale = LONG_SIDE_MIN / longSide;
    targetW = Math.round(srcW * scale);
    targetH = Math.round(srcH * scale);
  }

  onProgress?.(45);

  // Create destination canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = targetW;
  dstCanvas.height = targetH;

  if (targetW !== srcW || targetH !== srcH) {
    // Upscale with Pica (Lanczos-3 by default)
    await pica.resize(srcCanvas, dstCanvas, {
      filter: 'lanczos3',
      unsharpAmount: 0,
      unsharpRadius: 0,
      unsharpThreshold: 0,
    });
  } else {
    // Same size — just copy
    const dstCtx = dstCanvas.getContext('2d')!;
    dstCtx.drawImage(srcCanvas, 0, 0);
  }

  onProgress?.(75);

  // Apply subtle sharpening
  const dstCtx = dstCanvas.getContext('2d')!;
  applySharpening(dstCtx, targetW, targetH);

  onProgress?.(88);

  // Encode output
  let mimeType: string;
  let quality: number | undefined;
  if (format === 'jpg') {
    mimeType = 'image/jpeg';
    quality = 1.0;
  } else if (format === 'webp') {
    mimeType = 'image/webp';
    quality = 1.0; // lossless via quality=1
  } else {
    mimeType = 'image/png';
    quality = undefined;
  }

  const blob = await pica.toBlob(dstCanvas, mimeType, quality);

  onProgress?.(100);

  return {
    blob,
    outputWidth: targetW,
    outputHeight: targetH,
    originalWidth,
    originalHeight,
  };
}

export function buildOutputFilename(
  originalName: string,
  format: OutputFormat,
): string {
  const dotIdx = originalName.lastIndexOf('.');
  const base = dotIdx >= 0 ? originalName.slice(0, dotIdx) : originalName;
  const ext = format === 'jpg' ? 'jpg' : format === 'png' ? 'png' : 'webp';
  return `${base}_300dpi.${ext}`;
}
