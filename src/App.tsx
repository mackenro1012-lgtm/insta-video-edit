import { useEffect, useRef, useState } from 'react';
import VideoUploader from './components/VideoUploader';
import VideoPreview from './components/VideoPreview';
import Timeline from './components/Timeline';
import TextOverlayPanel from './components/TextOverlayPanel';
import FilterPanel from './components/FilterPanel';
import ExportPanel from './components/ExportPanel';
import { exportVideo } from './lib/export';
import { transcribeVideo } from './lib/transcribe';
import { DEFAULT_EXPORT_CRF, DEFAULT_FILTERS, DEFAULT_SILENCE_REMOVAL } from './types';
import type {
  ExportStage,
  FilterSettings,
  SilenceRemovalSettings,
  TextOverlay,
  TrimRange,
} from './types';

type Tab = 'text' | 'filter' | 'export';

function createOverlay(duration: number): TextOverlay {
  return {
    id: crypto.randomUUID(),
    text: '',
    x: 0.5,
    y: 0.8,
    fontSize: 64,
    color: '#ffffff',
    startTime: 0,
    endTime: Math.max(1, duration),
  };
}

function createCaptionOverlay(text: string, startTime: number, endTime: number): TextOverlay {
  return {
    id: crypto.randomUUID(),
    text,
    x: 0.5,
    y: 0.85,
    fontSize: 52,
    color: '#ffffff',
    startTime,
    endTime,
  };
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ duration: number; width: number; height: number } | null>(
    null,
  );
  const [trim, setTrim] = useState<TrimRange>({ start: 0, end: 0 });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [filters, setFilters] = useState<FilterSettings>(DEFAULT_FILTERS);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('text');
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);

  const [exportStage, setExportStage] = useState<ExportStage>('idle');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [silenceRemoval, setSilenceRemoval] = useState<SilenceRemovalSettings>(
    DEFAULT_SILENCE_REMOVAL,
  );
  const [qualityCrf, setQualityCrf] = useState<number>(DEFAULT_EXPORT_CRF);
  const [autoCaptionStatus, setAutoCaptionStatus] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  function handleSelectFile(selected: File) {
    setFile(selected);
    setVideoUrl(URL.createObjectURL(selected));
    setVideoMeta(null);
    setTrim({ start: 0, end: 0 });
    setCurrentTime(0);
    setFilters(DEFAULT_FILTERS);
    setOverlays([]);
    setSelectedOverlayId(null);
    setThumbnailSrc(null);
    setExportStage('idle');
    setResultUrl(null);
    setSilenceRemoval(DEFAULT_SILENCE_REMOVAL);
    setQualityCrf(DEFAULT_EXPORT_CRF);
    setAutoCaptionStatus(null);
  }

  function handleLoadedMetadata(meta: { duration: number; width: number; height: number }) {
    setVideoMeta(meta);
    setTrim({ start: 0, end: meta.duration });
  }

  // Capture a frame as a thumbnail for the filter preset previews once we know the duration.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoMeta || thumbnailSrc) return;

    function capture() {
      if (!video) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbnailSrc(canvas.toDataURL('image/jpeg', 0.8));
    }

    if (video.readyState >= 2) {
      capture();
    } else {
      video.addEventListener('loadeddata', capture, { once: true });
      return () => video.removeEventListener('loadeddata', capture);
    }
  }, [videoMeta, thumbnailSrc]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime >= trim.end || video.currentTime < trim.start) {
        video.currentTime = trim.start;
      }
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function handleSeek(time: number) {
    const video = videoRef.current;
    if (video) video.currentTime = time;
    setCurrentTime(time);
  }

  function handleAddOverlay() {
    const overlay = createOverlay(trim.end - trim.start);
    setOverlays((prev) => [...prev, overlay]);
    setSelectedOverlayId(overlay.id);
    setTab('text');
  }

  async function handleAutoCaption() {
    if (!file) return;
    try {
      setAutoCaptionStatus('準備中...');
      const segments = await transcribeVideo(file, trim, (p) => {
        if (p.stage === 'loading-model') {
          setAutoCaptionStatus(
            p.ratio ? `モデルを準備中... ${Math.round(p.ratio * 100)}%` : 'モデルを準備中...',
          );
        } else if (p.stage === 'extracting-audio') {
          setAutoCaptionStatus('音声を解析中...');
        } else {
          setAutoCaptionStatus('文字起こし中...');
        }
      });
      if (segments.length === 0) {
        setAutoCaptionStatus(null);
        return;
      }
      const newOverlays = segments.map((seg) => createCaptionOverlay(seg.text, seg.start, seg.end));
      setOverlays((prev) => [...prev, ...newOverlays]);
      setSelectedOverlayId(newOverlays[0].id);
      setAutoCaptionStatus(null);
    } catch (err) {
      console.error(err);
      setAutoCaptionStatus(null);
      window.alert(
        `自動字幕の生成に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  function handleChangeOverlay(id: string, patch: Partial<TextOverlay>) {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function handleDeleteOverlay(id: string) {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    setSelectedOverlayId((cur) => (cur === id ? null : cur));
  }

  async function handleExport() {
    if (!file || !videoMeta) return;
    setExportStage('loading-ffmpeg');
    setExportProgress(0);
    setExportError(null);
    videoRef.current?.pause();
    setIsPlaying(false);
    try {
      const blob = await exportVideo({
        file,
        trim,
        filters,
        overlays,
        videoWidth: videoMeta.width,
        videoHeight: videoMeta.height,
        silenceRemoval,
        qualityCrf,
        onStage: setExportStage,
        onProgress: (ratio) => {
          setExportStage('processing');
          setExportProgress(ratio);
        },
      });
      setResultUrl(URL.createObjectURL(blob));
      setExportStage('done');
    } catch (err) {
      console.error(err);
      setExportError(err instanceof Error ? err.message : String(err));
      setExportStage('error');
    }
  }

  function handleReset() {
    setResultUrl(null);
    setExportStage('idle');
    setTab('text');
  }

  if (!videoUrl) {
    return (
      <div className="flex h-screen w-screen flex-col bg-black text-white">
        <Header />
        <div className="flex-1">
          <VideoUploader onSelect={handleSelectFile} />
        </div>
      </div>
    );
  }

  const aspectRatio = videoMeta ? videoMeta.width / videoMeta.height : 9 / 16;

  return (
    <div className="flex h-screen w-screen flex-col bg-black text-white md:flex-row">
      <div className="relative flex flex-1 flex-col">
        <Header />
        <div className="relative flex-1">
          <VideoPreview
            ref={videoRef}
            src={videoUrl}
            aspectRatio={aspectRatio}
            filters={filters}
            overlays={overlays}
            trim={trim}
            currentTime={currentTime}
            selectedOverlayId={selectedOverlayId}
            onSelectOverlay={(id) => {
              setSelectedOverlayId(id);
              setTab('text');
            }}
            onMoveOverlay={(id, x, y) => handleChangeOverlay(id, { x, y })}
            onTimeUpdate={setCurrentTime}
            onLoadedMetadata={handleLoadedMetadata}
          />
          <button
            onClick={togglePlay}
            className="absolute bottom-6 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur"
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
        {videoMeta && (
          <Timeline
            duration={videoMeta.duration}
            trim={trim}
            currentTime={currentTime}
            onTrimChange={setTrim}
            onSeek={handleSeek}
          />
        )}
      </div>

      <div className="flex h-80 w-full flex-col border-t border-neutral-800 md:h-auto md:w-96 md:border-l md:border-t-0">
        <div className="flex border-b border-neutral-800">
          {(['text', 'filter', 'export'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium ${
                tab === t ? 'border-b-2 border-pink-500 text-white' : 'text-neutral-500'
              }`}
            >
              {t === 'text' ? 'テキスト' : t === 'filter' ? 'フィルター' : '書き出し'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          {tab === 'text' && (
            <TextOverlayPanel
              overlays={overlays}
              selectedId={selectedOverlayId}
              duration={trim.end - trim.start}
              onSelect={setSelectedOverlayId}
              onAdd={handleAddOverlay}
              onChange={handleChangeOverlay}
              onDelete={handleDeleteOverlay}
              onAutoCaption={handleAutoCaption}
              autoCaptionStatus={autoCaptionStatus}
            />
          )}
          {tab === 'filter' && (
            <FilterPanel filters={filters} thumbnailSrc={thumbnailSrc} onChange={setFilters} />
          )}
          {tab === 'export' && (
            <ExportPanel
              stage={exportStage}
              progress={exportProgress}
              errorMessage={exportError}
              resultUrl={resultUrl}
              silenceRemoval={silenceRemoval}
              onSilenceRemovalChange={setSilenceRemoval}
              qualityCrf={qualityCrf}
              onQualityCrfChange={setQualityCrf}
              onExport={handleExport}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
      <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" />
      <span className="text-sm font-semibold tracking-wide">Reel Studio</span>
    </div>
  );
}
