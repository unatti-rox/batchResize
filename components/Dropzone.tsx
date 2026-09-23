"use client";

import { useCallback, useRef, useState } from "react";

interface DropzoneProps {
  onFile: (file: File) => void;
  previewUrl: string | null;
  fileName: string | null;
  fileMeta: string | null;
}

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export default function Dropzone({
  onFile,
  previewUrl,
  fileName,
  fileMeta,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        setError("Use a PNG, JPEG, or WebP master creative.");
        return;
      }
      setError(null);
      onFile(file);
    },
    [onFile]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-accent bg-accent/10"
            : "border-line bg-panel hover:border-accent/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={previewUrl}
              alt="Master creative preview"
              className="max-h-48 rounded-lg border border-line object-contain shadow-lg"
            />
            <div className="text-sm text-slate-300">
              <span className="font-medium text-slate-100">{fileName}</span>
              {fileMeta ? (
                <span className="ml-2 text-slate-500">{fileMeta}</span>
              ) : null}
            </div>
            <span className="text-xs text-accent2">
              Click or drop to replace
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 16V4m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-100">
              Drop your master creative here
            </p>
            <p className="text-xs text-slate-500">
              PNG, JPEG, or WebP · highest resolution you have on hand
            </p>
          </div>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-bad">{error}</p> : null}
    </div>
  );
}
