import type { FilterPreset, FilterSettings } from '../types';

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', label: 'オリジナル', values: { brightness: 0, contrast: 0, saturation: 0 } },
  { id: 'clarendon', label: 'Clarendon', values: { brightness: 8, contrast: 25, saturation: 35 } },
  { id: 'gingham', label: 'Gingham', values: { brightness: 5, contrast: -15, saturation: -20 } },
  { id: 'juno', label: 'Juno', values: { brightness: 10, contrast: 15, saturation: 40 } },
  { id: 'lark', label: 'Lark', values: { brightness: 15, contrast: -10, saturation: 10 } },
  { id: 'moon', label: 'Moon', values: { brightness: 5, contrast: 10, saturation: -100 } },
];

export function cssFilterString(f: FilterSettings): string {
  const brightness = 1 + f.brightness / 100;
  const contrast = 1 + f.contrast / 100;
  const saturate = 1 + f.saturation / 100;
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
}

/** Maps our -100..100 sliders onto ffmpeg's `eq` filter ranges. */
export function ffmpegEqArgs(f: FilterSettings): string {
  const brightness = (f.brightness / 100) * 0.5; // eq brightness: -1..1
  const contrast = 1 + f.contrast / 100; // eq contrast: 0..2 typical
  const saturation = Math.max(0, 1 + f.saturation / 100); // eq saturation: 0..3
  return `eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}`;
}
