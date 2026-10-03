import { fetchFile } from '@ffmpeg/util';
import type { FilterSettings, TextOverlay, TrimRange } from '../types';
import { getFFmpeg } from './ffmpeg';
import { ffmpegEqArgs } from './filters';

const FONT_PATH = '/fonts/NotoSansJP-Variable.ttf';
const FONT_FS_NAME = 'overlay-font.ttf';

export interface ExportOptions {
  file: File;
  trim: TrimRange;
  filters: FilterSettings;
  overlays: TextOverlay[];
  videoWidth: number;
  videoHeight: number;
  onProgress?: (ratio: number) => void;
}

function escapeDrawtextValue(value: string): string {
  // Escape characters that are special inside an ffmpeg filter option value.
  return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function buildFilterChain(
  filters: FilterSettings,
  overlays: TextOverlay[],
  videoWidth: number,
): string {
  const parts: string[] = [ffmpegEqArgs(filters)];

  overlays.forEach((overlay, index) => {
    if (!overlay.text.trim()) return;
    const fontSizePx = Math.max(8, Math.round((overlay.fontSize * videoWidth) / 1080));
    const textFile = escapeDrawtextValue(`ov${index}.txt`);
    const fontFile = escapeDrawtextValue(FONT_FS_NAME);
    const color = escapeDrawtextValue(overlay.color);
    const x = `main_w*${overlay.x.toFixed(4)}-text_w/2`;
    const y = `main_h*${overlay.y.toFixed(4)}-text_h/2`;
    const start = Math.max(0, overlay.startTime).toFixed(3);
    const end = Math.max(0, overlay.endTime).toFixed(3);
    parts.push(
      `drawtext=fontfile=${fontFile}:textfile=${textFile}:fontsize=${fontSizePx}:fontcolor=${color}:borderw=2:bordercolor=black@0.6:x=${x}:y=${y}:enable='between(t,${start},${end})'`,
    );
  });

  return parts.join(',');
}

export async function exportVideo(options: ExportOptions): Promise<Blob> {
  const { file, trim, filters, overlays, videoWidth, onProgress } = options;
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
  const filterChain = buildFilterChain(filters, overlays, videoWidth);

  const exitCode = await ffmpeg.exec([
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
  ]);

  ffmpeg.off('log', onLog);

  const data = await ffmpeg.readFile(outputName);
  if (exitCode !== 0 || data.length === 0) {
    const tail = logLines.slice(-20).join('\n');
    throw new Error(`ffmpeg failed (exit ${exitCode}, output ${data.length} bytes):\n${tail}`);
  }

  return new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
}
