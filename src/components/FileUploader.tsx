import React, { useRef, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUploader({ onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    onFiles(Array.from(files));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  return (
    <div
      className={`uploader ${dragging ? 'uploader--drag' : ''} ${disabled ? 'uploader--disabled' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      aria-label="이미지 업로드 영역"
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="uploader__icon">🖼️</div>
      <p className="uploader__main">
        이미지를 드래그하거나 클릭하여 업로드
      </p>
      <p className="uploader__sub">JPG · JPEG · PNG · WEBP 지원 · 여러 장 동시 업로드 가능</p>
    </div>
  );
}
