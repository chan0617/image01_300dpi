import type { OutputFormat } from '../types';

interface Props {
  format: OutputFormat;
  onChange: (f: OutputFormat) => void;
  disabled?: boolean;
}

const FORMATS: { value: OutputFormat; label: string; desc: string }[] = [
  { value: 'jpg', label: 'JPG', desc: '품질 100 · 가장 작은 파일 크기' },
  { value: 'png', label: 'PNG', desc: '무손실 · 투명 배경 지원' },
  { value: 'webp', label: 'WEBP Lossless', desc: '무손실 · 최신 포맷' },
];

export function ConversionOptions({ format, onChange, disabled }: Props) {
  return (
    <section className="options">
      <h2 className="options__title">출력 형식</h2>
      <div className="options__grid">
        {FORMATS.map((f) => (
          <label
            key={f.value}
            className={`format-card ${format === f.value ? 'format-card--active' : ''} ${disabled ? 'format-card--disabled' : ''}`}
          >
            <input
              type="radio"
              name="format"
              value={f.value}
              checked={format === f.value}
              onChange={() => onChange(f.value)}
              disabled={disabled}
              style={{ display: 'none' }}
            />
            <span className="format-card__label">{f.label}</span>
            <span className="format-card__desc">{f.desc}</span>
          </label>
        ))}
      </div>
      <p className="options__note">
        모든 이미지는 긴 변 기준 최소 3,000px · 실제 픽셀 변환 · 선명도 적용
      </p>
    </section>
  );
}
