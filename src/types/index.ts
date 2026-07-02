export type OutputFormat = 'jpg' | 'png' | 'webp';

export type FileStatus = 'pending' | 'converting' | 'done' | 'error' | 'skipped';

export interface ImageFile {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  status: FileStatus;
  error?: string;
  outputBlob?: Blob;
  originalWidth?: number;
  originalHeight?: number;
  outputWidth?: number;
  outputHeight?: number;
}

export interface ConversionOptions {
  format: OutputFormat;
}

export interface Progress {
  current: number;
  total: number;
  phase: 'idle' | 'converting' | 'zipping' | 'done';
  label: string;
}
