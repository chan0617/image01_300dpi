import type { Progress } from '../types';

interface Props {
  progress: Progress;
}

export function ProgressSection({ progress }: Props) {
  if (progress.phase === 'idle') return null;

  const pct =
    progress.phase === 'zipping'
      ? progress.current
      : progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;

  return (
    <div className="progress-section">
      <div className="progress-section__label">{progress.label}</div>
      <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="progress-bar__fill"
          style={{ width: `${pct}%`, transition: 'width 0.2s ease' }}
        />
      </div>
      <div className="progress-section__pct">{pct}%</div>
    </div>
  );
}
