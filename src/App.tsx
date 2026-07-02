import { useImageConverter } from './hooks/useImageConverter';
import { FileUploader } from './components/FileUploader';
import { ImageList } from './components/ImageList';
import { ConversionOptions } from './components/ConversionOptions';
import { ProgressSection } from './components/ProgressSection';
import { SkippedAlert } from './components/SkippedAlert';
import './App.css';

export default function App() {
  const {
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
  } = useImageConverter();

  const isConverting = progress.phase === 'converting';
  const isZipping = progress.phase === 'zipping';
  const isBusy = isConverting || isZipping;

  const doneCount = images.filter((img) => img.status === 'done').length;
  const errorImages = images.filter((img) => img.status === 'error');
  const pendingCount = images.filter(
    (img) => img.status === 'pending' || img.status === 'error',
  ).length;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__title">Image → 300 DPI</h1>
        <p className="app-header__sub">
          인쇄용 고화질 이미지 변환 · 긴 변 최소 3,000px · 실제 픽셀 확대
        </p>
      </header>

      <main className="app-main">
        <section className="section">
          <FileUploader onFiles={addFiles} disabled={isBusy} />
        </section>

        <SkippedAlert names={skippedNames} onDismiss={dismissSkipped} />

        {images.length > 0 && (
          <section className="section">
            <ImageList
              images={images}
              onRemove={removeImage}
              onClear={clearAll}
              disabled={isBusy}
            />
          </section>
        )}

        {images.length > 0 && (
          <section className="section">
            <ConversionOptions
              format={options.format}
              onChange={setFormat}
              disabled={isBusy}
            />
          </section>
        )}

        <ProgressSection progress={progress} />

        {errorImages.length > 0 && progress.phase === 'done' && (
          <div className="alert alert--error">
            <strong>변환 실패 {errorImages.length}개</strong>
            <ul className="alert__list">
              {errorImages.map((img) => (
                <li key={img.id}>
                  {img.name}
                  {img.error ? ` — ${img.error}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {images.length > 0 && (
          <div className="action-row">
            {pendingCount > 0 && (
              <button
                className="btn btn--primary"
                onClick={startConversion}
                disabled={isBusy}
              >
                {isConverting
                  ? `변환 중… (${progress.current}/${progress.total})`
                  : `변환 시작 (${pendingCount}장)`}
              </button>
            )}

            {doneCount > 0 && (
              <button
                className="btn btn--success"
                onClick={download}
                disabled={isBusy}
              >
                {isZipping
                  ? 'ZIP 생성 중…'
                  : doneCount === 1
                    ? '다운로드 (1장)'
                    : `ZIP 다운로드 (${doneCount}장)`}
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        모든 변환은 브라우저에서 처리됩니다 · 이미지가 서버에 업로드되지 않습니다
      </footer>
    </div>
  );
}
