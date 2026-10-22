import type { ExportStage, SilenceRemovalSettings } from '../types';

interface ExportPanelProps {
  stage: ExportStage;
  progress: number;
  errorMessage: string | null;
  resultUrl: string | null;
  silenceRemoval: SilenceRemovalSettings;
  onSilenceRemovalChange: (settings: SilenceRemovalSettings) => void;
  onExport: () => void;
  onReset: () => void;
}

export default function ExportPanel({
  stage,
  progress,
  errorMessage,
  resultUrl,
  silenceRemoval,
  onSilenceRemovalChange,
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

  const isBusy = stage === 'loading-ffmpeg' || stage === 'analyzing' || stage === 'processing';
  const stageLabel =
    stage === 'loading-ffmpeg'
      ? '準備中...'
      : stage === 'analyzing'
        ? '無音部分を検出中...'
        : `書き出し中... ${Math.round(progress * 100)}%`;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-lg bg-neutral-800 p-3">
        <label className="flex items-center justify-between gap-2">
          <span className="text-sm text-neutral-200">無音部分を自動でカット</span>
          <input
            type="checkbox"
            checked={silenceRemoval.enabled}
            disabled={isBusy}
            onChange={(e) => onSilenceRemovalChange({ ...silenceRemoval, enabled: e.target.checked })}
            className="h-5 w-5 accent-pink-500"
          />
        </label>
        {silenceRemoval.enabled && (
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-400">
                感度(無音とみなす音量): {silenceRemoval.thresholdDb} dB
              </label>
              <input
                type="range"
                min={-60}
                max={-10}
                value={silenceRemoval.thresholdDb}
                disabled={isBusy}
                onChange={(e) =>
                  onSilenceRemovalChange({
                    ...silenceRemoval,
                    thresholdDb: Number(e.target.value),
                  })
                }
                className="w-full"
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                数値を大きく(0に近く)すると、より小さな音まで無音として検出されます
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-400">
                最短カット長: {silenceRemoval.minDurationSec.toFixed(1)}秒
              </label>
              <input
                type="range"
                min={0.1}
                max={2}
                step={0.1}
                value={silenceRemoval.minDurationSec}
                disabled={isBusy}
                onChange={(e) =>
                  onSilenceRemovalChange({
                    ...silenceRemoval,
                    minDurationSec: Number(e.target.value),
                  })
                }
                className="w-full"
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                これより短い無音は削られません(短すぎると不自然なカットになります)
              </p>
            </div>
          </div>
        )}
      </div>

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
          <p className="text-center text-xs text-neutral-400">{stageLabel}</p>
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
