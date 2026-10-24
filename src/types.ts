export interface TextOverlay {
  id: string;
  text: string;
  /** 0-1, relative to video width, position of the text box center */
  x: number;
  /** 0-1, relative to video height, position of the text box center */
  y: number;
  /** font size in px, relative to a 1080px-wide reference frame */
  fontSize: number;
  color: string;
  /** seconds, relative to the trimmed output timeline */
  startTime: number;
  endTime: number;
}

export interface FilterSettings {
  /** -100..100 */
  brightness: number;
  /** -100..100 */
  contrast: number;
  /** -100..100 */
  saturation: number;
}

export const DEFAULT_FILTERS: FilterSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

export interface FilterPreset {
  id: string;
  label: string;
  values: FilterSettings;
}

export interface TrimRange {
  start: number;
  end: number;
}

export interface SilenceRemovalSettings {
  enabled: boolean;
  /** dBFS threshold below which audio is considered silent (negative number, e.g. -30) */
  thresholdDb: number;
  /** minimum duration in seconds for a quiet stretch to count as silence */
  minDurationSec: number;
}

export const DEFAULT_SILENCE_REMOVAL: SilenceRemovalSettings = {
  enabled: false,
  thresholdDb: -30,
  minDurationSec: 0.5,
};

export type ExportStage =
  | 'idle'
  | 'loading-ffmpeg'
  | 'analyzing'
  | 'processing'
  | 'done'
  | 'error';

/**
 * ffmpeg's CRF value for the final encode: lower = higher quality & larger file,
 * higher = more compression & smaller file. 18 is near-visually-lossless, 28 is
 * noticeably soft. Kept deliberately narrow so every setting still looks reasonable.
 */
export const EXPORT_QUALITY_MIN_CRF = 18;
export const EXPORT_QUALITY_MAX_CRF = 30;
export const DEFAULT_EXPORT_CRF = 23;
