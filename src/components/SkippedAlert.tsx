interface Props {
  names: string[];
  onDismiss: () => void;
}

export function SkippedAlert({ names, onDismiss }: Props) {
  if (names.length === 0) return null;

  return (
    <div className="alert alert--warn">
      <div className="alert__header">
        <strong>지원하지 않는 파일 {names.length}개가 제외되었습니다</strong>
        <button className="alert__close" onClick={onDismiss} aria-label="닫기">
          ×
        </button>
      </div>
      <ul className="alert__list">
        {names.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
