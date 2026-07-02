import { useState, useCallback, useRef } from 'react';
import type { ImageFile, ConversionOptions, Progress, OutputFormat } from '../types';
import { processImage } from '../utils/imageProcessor';
import { downloadFiles } from '../utils/zipCreator';

const SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const CONCURRENCY = 3;

function uid(): string {
  return Math.random().toString(36).slice(2);
}

export function useImageConverter() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [options, setOptions] = useState<ConversionOptions>({ format: 'jpg' });
  const [progress, setProgress] = useState<Progress>({
    current: 0,
    total: 0,
    phase: 'idle',
    label: '',
  });
  const [skippedNames, setSkippedNames] = useState<string[]>([]);
  const cancelRef = useRef(false);

  const addFiles = useCallback((files: File[]) => {
    const accepted: ImageFile[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      const type = file.type.toLowerCase();
      if (SUPPORTED_TYPES.has(type) || /\.(jpe?g|png|webp)$/i.test(file.name)) {
        const previewUrl = URL.createObjectURL(file);
        accepted.push({
          id: uid(),
          file,
          name: file.name,
          previewUrl,
          status: 'pending',
        });
      } else {
        rejected.push(file.name);
      }
    }

    setImages((prev) => [...prev, ...accepted]);
    if (rejected.length > 0) {
      setSkippedNames((prev) => [...prev, ...rejected]);
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
    setSkippedNames([]);
    setProgress({ current: 0, total: 0, phase: 'idle', label: '' });
  }, []);

  const updateImage = useCallback(
    (id: string, patch: Partial<ImageFile>) => {
      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, ...patch } : img)),
      );
    },
    [],
  );

  const startConversion = useCallback(async () => {
    const pending = images.filter((img) => img.status === 'pending' || img.status === 'error');
    if (pending.length === 0) return;

    cancelRef.current = false;

    setProgress({
      current: 0,
      total: pending.length,
      phase: 'converting',
      label: '변환 중...',
    });

    // Mark all pending as converting (reset errors)
    setImages((prev) =>
      prev.map((img) =>
        pending.find((p) => p.id === img.id)
          ? { ...img, status: 'converting', error: undefined }
          : img,
      ),
    );

    let completed = 0;

    // Process with concurrency limit
    async function worker(queue: ImageFile[]) {
      while (queue.length > 0) {
        if (cancelRef.current) break;
        const img = queue.shift()!;
        try {
          const result = await processImage(img.file, options.format, (_pct) => {
            // per-image sub-progress not surfaced globally
          });
          updateImage(img.id, {
            status: 'done',
            outputBlob: result.blob,
            originalWidth: result.originalWidth,
            originalHeight: result.originalHeight,
            outputWidth: result.outputWidth,
            outputHeight: result.outputHeight,
          });
        } catch (err) {
          updateImage(img.id, {
            status: 'error',
            error: err instanceof Error ? err.message : '변환 실패',
          });
        }
        completed++;
        setProgress((p) => ({
          ...p,
          current: completed,
          label: `변환 중... (${completed}/${pending.length})`,
        }));
      }
    }

    const queue = [...pending];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(CONCURRENCY, pending.length); i++) {
      workers.push(worker(queue));
    }
    await Promise.all(workers);

    setProgress((p) => ({
      ...p,
      phase: 'done',
      label: '변환 완료',
    }));
  }, [images, options.format, updateImage]);

  const download = useCallback(async () => {
    setProgress((p) => ({
      ...p,
      phase: 'zipping',
      label: 'ZIP 생성 중...',
    }));

    await downloadFiles(images, options.format, (pct) => {
      setProgress((p) => ({
        ...p,
        current: pct,
        total: 100,
        label: `ZIP 생성 중... ${pct}%`,
      }));
    });

    setProgress((p) => ({
      ...p,
      phase: 'done',
      label: '다운로드 완료',
    }));
  }, [images, options.format]);

  const setFormat = useCallback((format: OutputFormat) => {
    setOptions((prev) => ({ ...prev, format }));
  }, []);

  const dismissSkipped = useCallback(() => setSkippedNames([]), []);

  return {
    images,
    options,
    progress,
    skippedNames,
    addFiles,
    removeImage,
    clearAll,
    startConversion,
    download,
    setFormat,
    dismissSkipped,
  };
}
