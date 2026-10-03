import type { ExportStage } from '../types';

interface ExportPanelProps {
  stage: ExportStage;
  progress: number;
  errorMessage: string | null;
  resultUrl: string | null;
  onExport: () => void;
  onReset: () => void;
}

export default function ExportPanel({
  stage,
  progress,
  errorMessage,
  resultUrl,
  onExport,
  onReset,
}: ExportPanelProps) {
  if (stage === 'done' && resultUrl) {
    return (
      <div className="flex flex-col items-center gap-3 p-4">
        <p className="text-sm font-semibold text-green-400">書き出し完了！</p>
        <a
          href={resultUrl}
          download="reel.mp4"
          className="w-full rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 py-2 text-center text-sm font-semibold text-white"
        >
          ダウンロード
        </a>
        <button onClick={onReset} className="text-xs text-neutral-400 underline">
          もう一度編集する
        </button>
      </div>
    );
  }

  const isBusy = stage === 'loading-ffmpeg' || stage === 'processing';

  return (
    <div className="flex flex-col gap-2 p-4">
      {stage === 'error' && errorMessage && (
        <p className="text-xs text-red-400">エラー: {errorMessage}</p>
      )}
      {isBusy && (
        <div className="flex flex-col gap-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-center text-xs text-neutral-400">
            {stage === 'loading-ffmpeg' ? '準備中...' : `書き出し中... ${Math.round(progress * 100)}%`}
          </p>
        </div>
      )}
      <button
        onClick={onExport}
        disabled={isBusy}
        className="w-full rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isBusy ? '処理中...' : '書き出す'}
      </button>
    </div>
  );
}
