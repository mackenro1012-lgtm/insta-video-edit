import type { FilterSettings } from '../types';
import { FILTER_PRESETS, cssFilterString } from '../lib/filters';

interface FilterPanelProps {
  filters: FilterSettings;
  thumbnailSrc: string | null;
  onChange: (filters: FilterSettings) => void;
}

const SLIDERS: { key: keyof FilterSettings; label: string }[] = [
  { key: 'brightness', label: '明るさ' },
  { key: 'contrast', label: 'コントラスト' },
  { key: 'saturation', label: '彩度' },
];

export default function FilterPanel({ filters, thumbnailSrc, onChange }: FilterPanelProps) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-300">フィルター</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {FILTER_PRESETS.map((preset) => {
            const isActive =
              filters.brightness === preset.values.brightness &&
              filters.contrast === preset.values.contrast &&
              filters.saturation === preset.values.saturation;
            return (
              <button
                key={preset.id}
                onClick={() => onChange(preset.values)}
                className="flex flex-shrink-0 flex-col items-center gap-1"
              >
                <div
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 bg-neutral-800 ${
                    isActive ? 'border-pink-500' : 'border-transparent'
                  }`}
                >
                  {thumbnailSrc && (
                    <img
                      src={thumbnailSrc}
                      className="h-full w-full object-cover"
                      style={{ filter: cssFilterString(preset.values) }}
                    />
                  )}
                </div>
                <span className="text-xs text-neutral-400">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-300">調整</h3>
        {SLIDERS.map(({ key, label }) => (
          <div key={key}>
            <label className="mb-1 block text-xs text-neutral-400">
              {label}: {filters[key]}
            </label>
            <input
              type="range"
              min={-100}
              max={100}
              value={filters[key]}
              onChange={(e) => onChange({ ...filters, [key]: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
