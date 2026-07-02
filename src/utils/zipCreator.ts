import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { ImageFile, OutputFormat } from '../types';
import { buildOutputFilename } from './imageProcessor';

export async function downloadFiles(
  images: ImageFile[],
  format: OutputFormat,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const done = images.filter((img) => img.status === 'done' && img.outputBlob);

  if (done.length === 0) return;

  if (done.length === 1) {
    const img = done[0];
    saveAs(img.outputBlob!, buildOutputFilename(img.name, format));
    onProgress?.(100);
    return;
  }

  const zip = new JSZip();
  const total = done.length;

  for (let i = 0; i < total; i++) {
    const img = done[i];
    zip.file(buildOutputFilename(img.name, format), img.outputBlob!);
    onProgress?.(Math.round(((i + 1) / total) * 80));
  }

  onProgress?.(85);
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'STORE' },
    (meta) => {
      onProgress?.(85 + Math.round(meta.percent * 0.15));
    },
  );
  saveAs(zipBlob, 'images_300dpi.zip');
  onProgress?.(100);
}
