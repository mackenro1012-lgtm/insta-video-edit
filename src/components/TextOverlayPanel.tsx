import type { TextOverlay } from '../types';

interface TextOverlayPanelProps {
  overlays: TextOverlay[];
  selectedId: string | null;
  duration: number;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<TextOverlay>) => void;
  onDelete: (id: string) => void;
}

const COLORS = ['#ffffff', '#000000', '#ff3040', '#ffdd00', '#00e0a4', '#4e7bff'];

export default function TextOverlayPanel({
  overlays,
  selectedId,
  duration,
  onSelect,
  onAdd,
  onChange,
  onDelete,
}: TextOverlayPanelProps) {
  const selected = overlays.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">テキスト</h3>
        <button
          onClick={onAdd}
          className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 px-3 py-1 text-xs font-semibold text-white"
        >
          + 追加
        </button>
      </div>

      {overlays.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {overlays.map((o, i) => (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className={`rounded-full px-3 py-1 text-xs ${
                o.id === selectedId ? 'bg-pink-500 text-white' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {o.text.trim() || `テキスト ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={selected.text}
            onChange={(e) => onChange(selected.id, { text: e.target.value })}
            placeholder="テキストを入力..."
            rows={2}
            className="w-full resize-none rounded-lg bg-neutral-800 p-2 text-sm text-white outline-none focus:ring-1 focus:ring-pink-500"
          />

          <div>
            <label className="mb-1 block text-xs text-neutral-400">文字色</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange(selected.id, { color: c })}
                  className={`h-6 w-6 rounded-full border-2 ${
                    selected.color === c ? 'border-pink-500' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              文字サイズ: {selected.fontSize}
            </label>
            <input
              type="range"
              min={20}
              max={160}
              value={selected.fontSize}
              onChange={(e) => onChange(selected.id, { fontSize: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              表示時間: {selected.startTime.toFixed(1)}s 〜 {selected.endTime.toFixed(1)}s
            </label>
            <div className="flex gap-2">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={selected.startTime}
                onChange={(e) =>
                  onChange(selected.id, {
                    startTime: Math.min(Number(e.target.value), selected.endTime - 0.1),
                  })
                }
                className="w-full"
              />
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={selected.endTime}
                onChange={(e) =>
                  onChange(selected.id, {
                    endTime: Math.max(Number(e.target.value), selected.startTime + 0.1),
                  })
                }
                className="w-full"
              />
            </div>
          </div>

          <button
            onClick={() => onDelete(selected.id)}
            className="mt-2 rounded-lg bg-neutral-800 py-2 text-sm text-red-400 hover:bg-neutral-700"
          >
            このテキストを削除
          </button>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">「+ 追加」でテキストを挿入できます。</p>
      )}
    </div>
  );
}
