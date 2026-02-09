'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileKey, Upload, AlertCircle } from 'lucide-react';

interface SealFileUploadProps {
  onFileLoaded: (sealData: unknown, rawFile: File) => void;
  disabled?: boolean;
}

export default function SealFileUpload({ onFileLoaded, disabled }: SealFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(undefined);

      if (!file.name.endsWith('.seal')) {
        setError('Please select a .seal file');
        return;
      }

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Basic validation
        if (!parsed.version || !parsed.encryptedData || !parsed.iv || !parsed.recipients) {
          setError('Invalid .seal file — missing required fields');
          return;
        }

        onFileLoaded(parsed, file);
      } catch {
        setError('Could not parse .seal file — it may be corrupted');
      }
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [disabled, processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [processFile]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative flex cursor-pointer flex-col items-center justify-center
          rounded-xl border-2 border-dashed p-10 transition-all
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          ${isDragging
            ? 'border-primary bg-primary-50/50 scale-[1.01]'
            : error
            ? 'border-error/30 bg-error/5'
            : 'border-slate-300 bg-slate-50 hover:border-primary/50 hover:bg-primary-50/30'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".seal"
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />

        <motion.div
          animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
          className={`mb-3 rounded-full p-3 ${
            isDragging ? 'bg-primary-100' : 'bg-slate-100'
          }`}
        >
          {isDragging ? (
            <Upload className="h-6 w-6 text-primary" />
          ) : (
            <FileKey className="h-6 w-6 text-slate-500" />
          )}
        </motion.div>

        <p className="text-sm font-medium text-slate-700">
          {isDragging ? 'Drop .seal file here' : 'Drop a .seal file here or click to browse'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Only .seal encrypted files are accepted
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-error"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
