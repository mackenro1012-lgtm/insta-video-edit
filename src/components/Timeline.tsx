import { useRef } from 'react';
import type { TrimRange } from '../types';

interface TimelineProps {
  duration: number;
  trim: TrimRange;
  currentTime: number;
  onTrimChange: (trim: TrimRange) => void;
  onSeek: (time: number) => void;
}

const MIN_TRIM_SECONDS = 0.5;

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rem = (s % 60).toFixed(1).padStart(4, '0');
  return `${m}:${rem}`;
}

export default function Timeline({ duration, trim, currentTime, onTrimChange, onSeek }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  function timeFromClientX(clientX: number): number {
    const track = trackRef.current;
    if (!track || duration <= 0) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }

  function startHandleDrag(e: React.PointerEvent, handle: 'start' | 'end') {
    e.preventDefault();
    e.stopPropagation();

    function handleMove(ev: PointerEvent) {
      const t = timeFromClientX(ev.clientX);
      if (handle === 'start') {
        const newStart = Math.min(t, trim.end - MIN_TRIM_SECONDS);
        onTrimChange({ start: Math.max(0, newStart), end: trim.end });
        onSeek(Math.max(0, newStart));
      } else {
        const newEnd = Math.max(t, trim.start + MIN_TRIM_SECONDS);
        onTrimChange({ start: trim.start, end: Math.min(duration, newEnd) });
        onSeek(Math.min(duration, newEnd));
      }
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  function startPlayheadDrag(e: React.PointerEvent) {
    e.preventDefault();
    const t = timeFromClientX(e.clientX);
    onSeek(Math.min(trim.end, Math.max(trim.start, t)));

    function handleMove(ev: PointerEvent) {
      const t2 = timeFromClientX(ev.clientX);
      onSeek(Math.min(trim.end, Math.max(trim.start, t2)));
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  const startPct = duration > 0 ? (trim.start / duration) * 100 : 0;
  const endPct = duration > 0 ? (trim.end / duration) * 100 : 100;
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full px-1 py-2">
      <div className="mb-1 flex justify-between text-xs text-neutral-400">
        <span>{formatTime(trim.start)}</span>
        <span>トリム: {formatTime(trim.end - trim.start)}</span>
        <span>{formatTime(trim.end)}</span>
      </div>
      <div ref={trackRef} className="relative h-10 w-full select-none rounded-lg bg-neutral-800">
        {/* dimmed regions outside the trim */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-lg bg-black/60"
          style={{ width: `${startPct}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 rounded-r-lg bg-black/60"
          style={{ width: `${100 - endPct}%` }}
        />
        {/* active trim range */}
        <div
          className="absolute inset-y-0 cursor-pointer bg-pink-500/20"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          onPointerDown={startPlayheadDrag}
        />
        {/* playhead */}
        <div
          className="pointer-events-none absolute top-0 h-full w-0.5 bg-white"
          style={{ left: `${playheadPct}%` }}
        />
        {/* start handle */}
        <div
          onPointerDown={(e) => startHandleDrag(e, 'start')}
          className="absolute top-0 h-full w-3 -translate-x-1/2 cursor-ew-resize rounded bg-white"
          style={{ left: `${startPct}%` }}
        />
        {/* end handle */}
        <div
          onPointerDown={(e) => startHandleDrag(e, 'end')}
          className="absolute top-0 h-full w-3 -translate-x-1/2 cursor-ew-resize rounded bg-white"
          style={{ left: `${endPct}%` }}
        />
      </div>
    </div>
  );
}
