import type { FFmpeg } from '@ffmpeg/ffmpeg';
import type { SilenceRemovalSettings, TrimRange } from '../types';

export interface TimeRange {
  start: number;
  end: number;
}

const SILENCE_START_RE = /silence_start:\s*(-?[\d.]+)/;
const SILENCE_END_RE = /silence_end:\s*(-?[\d.]+)/;

/**
 * Runs ffmpeg's silencedetect filter over [trim.start, trim.end] of the input and
 * returns the detected silent ranges, 0-based relative to trim.start (matching the
 * convention text-overlay times already use).
 */
export async function detectSilence(
  ffmpeg: FFmpeg,
  inputName: string,
  trim: TrimRange,
  settings: SilenceRemovalSettings,
): Promise<TimeRange[]> {
  const lines: string[] = [];
  const onLog = ({ message }: { message: string }) => lines.push(message);
  ffmpeg.on('log', onLog);

  const duration = Math.max(0.1, trim.end - trim.start);
  await ffmpeg.exec([
    '-ss',
    trim.start.toFixed(3),
    '-i',
    inputName,
    '-t',
    duration.toFixed(3),
    '-af',
    `silencedetect=noise=${settings.thresholdDb}dB:d=${settings.minDurationSec}`,
    '-f',
    'null',
    '-',
  ]);

  ffmpeg.off('log', onLog);

  const ranges: TimeRange[] = [];
  let pendingStart: number | null = null;
  for (const line of lines) {
    const startMatch = SILENCE_START_RE.exec(line);
    if (startMatch) {
      pendingStart = parseFloat(startMatch[1]);
      continue;
    }
    const endMatch = SILENCE_END_RE.exec(line);
    if (endMatch && pendingStart !== null) {
      ranges.push({ start: pendingStart, end: parseFloat(endMatch[1]) });
      pendingStart = null;
    }
  }
  // silencedetect doesn't emit silence_end if the clip ends while still silent.
  if (pendingStart !== null) {
    ranges.push({ start: pendingStart, end: duration });
  }

  return ranges;
}

const MIN_KEEP_SEGMENT_SEC = 0.05;

/** Complement of the silent ranges within [0, duration]: the parts to keep. */
export function computeKeepSegments(silentRanges: TimeRange[], duration: number): TimeRange[] {
  const sorted = [...silentRanges].sort((a, b) => a.start - b.start);
  const keep: TimeRange[] = [];
  let cursor = 0;

  for (const range of sorted) {
    const start = Math.max(0, Math.min(duration, range.start));
    const end = Math.max(0, Math.min(duration, range.end));
    if (start > cursor + MIN_KEEP_SEGMENT_SEC) {
      keep.push({ start: cursor, end: start });
    }
    cursor = Math.max(cursor, end);
  }
  if (duration - cursor > MIN_KEEP_SEGMENT_SEC) {
    keep.push({ start: cursor, end: duration });
  }

  return keep.length > 0 ? keep : [{ start: 0, end: duration }];
}

/** Maps a time in the original (pre-cut) timeline to its position after silent gaps are removed. */
export function remapTimeAfterCuts(t: number, keepSegments: TimeRange[]): number {
  let acc = 0;
  for (const seg of keepSegments) {
    if (t <= seg.start) break;
    acc += Math.max(0, Math.min(t, seg.end) - seg.start);
    if (t <= seg.end) break;
  }
  return acc;
}
