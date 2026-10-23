import { useRef } from 'react';
import type { TextOverlay } from '../types';

interface TextOverlayLayerProps {
  overlays: TextOverlay[];
  currentTime: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}

export default function TextOverlayLayer({
  overlays,
  currentTime,
  selectedId,
  onSelect,
  onMove,
}: TextOverlayLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  function startDrag(e: React.PointerEvent, overlay: TextOverlay) {
    e.preventDefault();
    e.stopPropagation();
    onSelect(overlay.id);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    function handleMove(ev: PointerEvent) {
      const x = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      onMove(overlay.id, x, y);
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      {overlays.map((overlay) => {
        const isActive = currentTime >= overlay.startTime && currentTime <= overlay.endTime;
        const isSelected = overlay.id === selectedId;
        if (!isActive && !isSelected) return null;
        return (
          <div
            key={overlay.id}
            onPointerDown={(e) => startDrag(e, overlay)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none whitespace-pre-wrap rounded px-1 text-center font-bold leading-tight ${
              isSelected ? 'outline outline-2 outline-pink-500' : ''
            } ${!isActive ? 'opacity-40' : ''}`}
            style={{
              left: `${overlay.x * 100}%`,
              top: `${overlay.y * 100}%`,
              fontSize: `${overlay.fontSize / 10.8}cqw`,
              color: overlay.color,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              maxWidth: '90%',
            }}
          >
            {overlay.text || '(テキストを入力)'}
          </div>
        );
      })}
    </div>
  );
}
