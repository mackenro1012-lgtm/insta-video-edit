import { forwardRef, useEffect } from 'react';
import type { FilterSettings, TextOverlay, TrimRange } from '../types';
import { cssFilterString } from '../lib/filters';
import TextOverlayLayer from './TextOverlayLayer';

interface VideoPreviewProps {
  src: string;
  /** native aspect ratio (width/height) of the loaded video; keeps overlay coords 1:1 with export */
  aspectRatio: number;
  filters: FilterSettings;
  overlays: TextOverlay[];
  trim: TrimRange;
  currentTime: number;
  selectedOverlayId: string | null;
  onSelectOverlay: (id: string) => void;
  onMoveOverlay: (id: string, x: number, y: number) => void;
  onTimeUpdate: (time: number) => void;
  onLoadedMetadata: (meta: { duration: number; width: number; height: number }) => void;
}

const VideoPreview = forwardRef<HTMLVideoElement, VideoPreviewProps>(function VideoPreview(
  {
    src,
    aspectRatio,
    filters,
    overlays,
    trim,
    currentTime,
    selectedOverlayId,
    onSelectOverlay,
    onMoveOverlay,
    onTimeUpdate,
    onLoadedMetadata,
  },
  ref,
) {
  // Keep playback inside the trim range: loop back to the trim start once we reach the end.
  useEffect(() => {
    const video = (ref as React.RefObject<HTMLVideoElement>)?.current;
    if (!video) return;
    if (video.currentTime >= trim.end) {
      video.currentTime = trim.start;
    }
  }, [trim.end, trim.start, ref]);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black p-4">
      <div
        className="relative max-h-full max-w-full overflow-hidden rounded-xl bg-neutral-950 shadow-2xl"
        style={{ aspectRatio: String(aspectRatio), height: '100%', containerType: 'inline-size' }}
      >
        <video
          ref={ref}
          src={src}
          className="h-full w-full object-contain"
          style={{ filter: cssFilterString(filters) }}
          playsInline
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime;
            if (t >= trim.end) {
              e.currentTarget.currentTime = trim.start;
            }
            onTimeUpdate(t);
          }}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            onLoadedMetadata({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
          }}
        />
        <TextOverlayLayer
          overlays={overlays}
          currentTime={currentTime - trim.start}
          selectedId={selectedOverlayId}
          onSelect={onSelectOverlay}
          onMove={onMoveOverlay}
        />
      </div>
    </div>
  );
});

export default VideoPreview;
