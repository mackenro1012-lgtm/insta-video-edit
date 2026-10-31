import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
// Bundled locally (instead of fetched from a CDN) so export works offline and isn't
// at the mercy of third-party CDN availability or network policies.
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

let ffmpegSingleton: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/** Loads the single-threaded ffmpeg.wasm core (no SharedArrayBuffer / COOP-COEP required). */
export async function getFFmpeg(onLog?: (message: string) => void): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton;
  if (loadPromise) return loadPromise;

  const ffmpeg = new FFmpeg();
  if (onLog) {
    ffmpeg.on('log', ({ message }) => onLog(message));
  }

  loadPromise = (async () => {
    await ffmpeg.load({
      coreURL: await toBlobURL(coreURL, 'text/javascript'),
      wasmURL: await toBlobURL(wasmURL, 'application/wasm'),
    });
    ffmpegSingleton = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}
