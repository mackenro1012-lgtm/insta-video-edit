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

export type ExportStage = 'idle' | 'loading-ffmpeg' | 'processing' | 'done' | 'error';
