import type { ImageFile } from '../types';

interface Props {
  images: ImageFile[];
  onRemove: (id: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

const statusLabel: Record<ImageFile['status'], string> = {
  pending: '대기',
  converting: '변환 중…',
  done: '완료',
  error: '실패',
  skipped: '제외됨',
};

const statusClass: Record<ImageFile['status'], string> = {
  pending: 'badge--pending',
  converting: 'badge--converting',
  done: 'badge--done',
  error: 'badge--error',
  skipped: 'badge--skipped',
};

function fmtPx(n?: number) {
  return n ? n.toLocaleString() : '—';
}

export function ImageList({ images, onRemove, onClear, disabled }: Props) {
  if (images.length === 0) return null;

  return (
    <section className="image-list">
      <div className="image-list__header">
        <span className="image-list__count">{images.length}장</span>
        <button
          className="btn btn--ghost btn--sm"
          onClick={onClear}
          disabled={disabled}
        >
          전체 삭제
        </button>
      </div>
      <ul className="image-list__grid">
        {images.map((img) => (
          <li key={img.id} className={`image-card image-card--${img.status}`}>
            <div className="image-card__thumb-wrap">
              <img
                src={img.previewUrl}
                alt={img.name}
                className="image-card__thumb"
                loading="lazy"
              />
              {img.status === 'converting' && (
                <div className="image-card__overlay">
                  <div className="spinner" />
                </div>
              )}
            </div>
            <div className="image-card__info">
              <p className="image-card__name" title={img.name}>
                {img.name}
              </p>
              <span className={`badge ${statusClass[img.status]}`}>
                {statusLabel[img.status]}
              </span>
              {img.outputWidth && (
                <p className="image-card__size">
                  {fmtPx(img.originalWidth)}×{fmtPx(img.originalHeight)}
                  {' → '}
                  {fmtPx(img.outputWidth)}×{fmtPx(img.outputHeight)} px
                </p>
              )}
              {img.error && (
                <p className="image-card__error" title={img.error}>
                  {img.error}
                </p>
              )}
            </div>
            {!disabled && (
              <button
                className="image-card__remove"
                onClick={() => onRemove(img.id)}
                aria-label="삭제"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
