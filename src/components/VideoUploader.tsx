import { useRef, useState } from 'react';

interface VideoUploaderProps {
  onSelect: (file: File) => void;
}

export default function VideoUploader({ onSelect }: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file && file.type.startsWith('video/')) {
      onSelect(file);
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
          isDragging ? 'border-pink-500 bg-pink-500/10' : 'border-neutral-700 hover:border-neutral-500'
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor">
            <path d="M12 16a4 4 0 100-8 4 4 0 000 8zm8-11h-3.17L15 3H9L7.17 5H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2z" />
          </svg>
        </div>
        <p className="text-lg font-semibold">動画をアップロード</p>
        <p className="text-sm text-neutral-400">
          クリックして選択、またはドラッグ&ドロップ
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
