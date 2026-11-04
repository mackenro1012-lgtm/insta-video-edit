import { fetchFile } from '@ffmpeg/util';
import type { TrimRange } from '../types';
import { getFFmpeg } from './ffmpeg';

const SAMPLE_RATE = 16000;

export interface TranscriptSegment {
  text: string;
  /** seconds, relative to the start of the trimmed range */
  start: number;
  end: number;
}

export interface TranscribeProgress {
  stage: 'loading-model' | 'extracting-audio' | 'transcribing';
  /** 0-1, only meaningful during 'loading-model' (model download progress) */
  ratio?: number;
}

/** Decodes the video's audio track (within the given trim range) to 16kHz mono PCM. */
async function extractAudioPCM(file: File, trim: TrimRange): Promise<Float32Array> {
  const ffmpeg = await getFFmpeg();
  const inputExt = file.name.split('.').pop() || 'mp4';
  const inputName = `asr-input.${inputExt}`;
  const outputName = 'asr-audio.pcm';

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const duration = Math.max(0.1, trim.end - trim.start);
  const exitCode = await ffmpeg.exec([
    '-ss',
    trim.start.toFixed(3),
    '-i',
    inputName,
    '-t',
    duration.toFixed(3),
    '-vn',
    '-ac',
    '1',
    '-ar',
    String(SAMPLE_RATE),
    '-f',
    'f32le',
    outputName,
  ]);
  if (exitCode !== 0) {
    throw new Error('音声の取り出しに失敗しました');
  }

  const data = await ffmpeg.readFile(outputName);
  const bytes = data as Uint8Array;
  // Copy into a freshly-aligned buffer so the Float32Array view is valid regardless
  // of the source Uint8Array's byteOffset.
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Float32Array(copy.buffer);
}

type AsrPipeline = (
  audio: Float32Array,
  options: Record<string, unknown>,
) => Promise<{ chunks?: { text: string; timestamp: [number, number | null] }[]; text: string }>;

let pipelinePromise: Promise<AsrPipeline> | null = null;

async function getPipeline(onProgress?: (p: TranscribeProgress) => void): Promise<AsrPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        progress_callback: (p: { status: string; progress?: number }) => {
          if (p.status === 'progress' && onProgress) {
            onProgress({ stage: 'loading-model', ratio: (p.progress ?? 0) / 100 });
          }
        },
      });
      return pipe as unknown as AsrPipeline;
    })();
  }
  return pipelinePromise;
}

/** Transcribes the audio within [trim.start, trim.end] into timed caption segments. */
export async function transcribeVideo(
  file: File,
  trim: TrimRange,
  onProgress?: (p: TranscribeProgress) => void,
): Promise<TranscriptSegment[]> {
  onProgress?.({ stage: 'loading-model', ratio: 0 });
  const pipe = await getPipeline(onProgress);

  onProgress?.({ stage: 'extracting-audio' });
  const audio = await extractAudioPCM(file, trim);

  onProgress?.({ stage: 'transcribing' });
  const result = await pipe(audio, {
    language: 'japanese',
    task: 'transcribe',
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const chunks = result.chunks ?? [];
  const segments: TranscriptSegment[] = [];
  for (const chunk of chunks) {
    const text = chunk.text.trim();
    if (!text) continue;
    const [start, end] = chunk.timestamp;
    segments.push({
      text,
      start: Math.max(0, start),
      end: end ?? Math.max(0, start) + 2,
    });
  }
  return segments;
}
