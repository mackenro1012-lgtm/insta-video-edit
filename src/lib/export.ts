import { fetchFile } from '@ffmpeg/util';
import type { FilterSettings, SilenceRemovalSettings, TextOverlay, TrimRange } from '../types';
import { getFFmpeg } from './ffmpeg';
import { ffmpegEqArgs } from './filters';
import { computeKeepSegments, detectSilence, remapTimeAfterCuts, type TimeRange } from './silence';

const FONT_PATH = '/fonts/NotoSansJP-Variable.ttf';
const FONT_FS_NAME = 'overlay-font.ttf';

export interface ExportOptions {
  file: File;
  trim: TrimRange;
  filters: FilterSettings;
  overlays: TextOverlay[];
  videoWidth: number;
  videoHeight: number;
  silenceRemoval: SilenceRemovalSettings;
  onProgress?: (ratio: number) => void;
  onStage?: (stage: 'analyzing' | 'processing') => void;
}

function escapeDrawtextValue(value: string): string {
  // Escape characters that are special inside an ffmpeg filter option value.
  return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function drawtextFilter(
  overlay: TextOverlay,
  index: number,
  videoWidth: number,
  startTime: number,
  endTime: number,
): string {
  const fontSizePx = Math.max(8, Math.round((overlay.fontSize * videoWidth) / 1080));
  const textFile = escapeDrawtextValue(`ov${index}.txt`);
  const fontFile = escapeDrawtextValue(FONT_FS_NAME);
  const color = escapeDrawtextValue(overlay.color);
  const x = `main_w*${overlay.x.toFixed(4)}-text_w/2`;
  const y = `main_h*${overlay.y.toFixed(4)}-text_h/2`;
  const start = Math.max(0, startTime).toFixed(3);
  const end = Math.max(0, endTime).toFixed(3);
  return `drawtext=fontfile=${fontFile}:textfile=${textFile}:fontsize=${fontSizePx}:fontcolor=${color}:borderw=2:bordercolor=black@0.6:x=${x}:y=${y}:enable='between(t,${start},${end})'`;
}

// Real-world phone footage is often variable-frame-rate. Without normalizing to a
// constant rate up front, ffmpeg has to pad gaps with duplicate frames downstream
// (in trim/concat especially), which can be extremely slow or destabilize the encode.
const FPS_NORMALIZE = 'fps=30';

function buildSimpleFilterChain(
  filters: FilterSettings,
  overlays: TextOverlay[],
  videoWidth: number,
): string {
  const parts: string[] = [FPS_NORMALIZE, ffmpegEqArgs(filters)];
  overlays.forEach((overlay, index) => {
    if (!overlay.text.trim()) return;
    parts.push(drawtextFilter(overlay, index, videoWidth, overlay.startTime, overlay.endTime));
  });
  return parts.join(',');
}

/**
 * Builds a filter_complex that trims out the given keep segments (in the original
 * file's own timeline) and concatenates what remains, then applies the color/text
 * filters on top of the concatenated (silence-free) result.
 */
function buildSilenceRemovalFilterComplex(
  keepSegments: TimeRange[],
  filters: FilterSettings,
  overlays: TextOverlay[],
  videoWidth: number,
): string {
  const splitLabels = keepSegments.map((_, i) => `vnorm${i}`);
  const parts: string[] = [
    `[0:v]${FPS_NORMALIZE},split=${keepSegments.length}${splitLabels.map((l) => `[${l}]`).join('')}`,
  ];
  const concatInputs: string[] = [];

  keepSegments.forEach((seg, i) => {
    parts.push(
      `[${splitLabels[i]}]trim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`,
    );
    parts.push(
      `[0:a]atrim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`,
    );
    concatInputs.push(`[v${i}][a${i}]`);
  });
  parts.push(`${concatInputs.join('')}concat=n=${keepSegments.length}:v=1:a=1[vcat][acat]`);

  let videoLabel = 'vcat';
  parts.push(`[${videoLabel}]${ffmpegEqArgs(filters)}[veq]`);
  videoLabel = 'veq';

  overlays.forEach((overlay, index) => {
    if (!overlay.text.trim()) return;
    const newStart = remapTimeAfterCuts(overlay.startTime, keepSegments);
    const newEnd = remapTimeAfterCuts(overlay.endTime, keepSegments);
    const outLabel = `t${index}`;
    parts.push(
      `[${videoLabel}]${drawtextFilter(overlay, index, videoWidth, newStart, newEnd)}[${outLabel}]`,
    );
    videoLabel = outLabel;
  });

  parts.push(`[${videoLabel}]null[vout]`);

  return parts.join(';');
}

export async function exportVideo(options: ExportOptions): Promise<Blob> {
  const { file, trim, filters, overlays, videoWidth, silenceRemoval, onProgress, onStage } =
    options;
  const ffmpeg = await getFFmpeg();

  const logLines: string[] = [];
  const onLog = ({ message }: { message: string }) => {
    logLines.push(message);
  };
  ffmpeg.on('log', onLog);

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      if (Number.isFinite(progress)) onProgress(Math.min(1, Math.max(0, progress)));
    });
  }

  const inputExt = file.name.split('.').pop() || 'mp4';
  const inputName = `input.${inputExt}`;
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.writeFile(FONT_FS_NAME, await fetchFile(FONT_PATH));

  for (const [index, overlay] of overlays.entries()) {
    if (!overlay.text.trim()) continue;
    await ffmpeg.writeFile(`ov${index}.txt`, new TextEncoder().encode(overlay.text));
  }

  const duration = Math.max(0.1, trim.end - trim.start);
  const outputName = 'output.mp4';

  let execArgs: string[];

  if (silenceRemoval.enabled) {
    onStage?.('analyzing');
    const silentRanges = await detectSilence(ffmpeg, inputName, trim, silenceRemoval);
    const keepSegments = computeKeepSegments(silentRanges, duration).map((seg) => ({
      start: seg.start + trim.start,
      end: seg.end + trim.start,
    }));

    onStage?.('processing');
    const filterComplex = buildSilenceRemovalFilterComplex(keepSegments, filters, overlays, videoWidth);
    execArgs = [
      '-i',
      inputName,
      '-filter_complex',
      filterComplex,
      '-map',
      '[vout]',
      '-map',
      '[acat]',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outputName,
    ];
  } else {
    onStage?.('processing');
    const filterChain = buildSimpleFilterChain(filters, overlays, videoWidth);
    execArgs = [
      '-ss',
      trim.start.toFixed(3),
      '-i',
      inputName,
      '-t',
      duration.toFixed(3),
      '-vf',
      filterChain,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outputName,
    ];
  }

  const exitCode = await ffmpeg.exec(execArgs);

  ffmpeg.off('log', onLog);

  const data = await ffmpeg.readFile(outputName);
  if (exitCode !== 0 || data.length === 0) {
    const tail = logLines.slice(-20).join('\n');
    throw new Error(`ffmpeg failed (exit ${exitCode}, output ${data.length} bytes):\n${tail}`);
  }

  return new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
}
