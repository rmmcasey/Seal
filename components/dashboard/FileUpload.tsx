'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { formatFileSize } from '@/lib/crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB free tier

interface FileUploadProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export default function FileUpload({ file, onFileSelect, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File): string | null => {
    if (f.size > MAX_FILE_SIZE) {
      return `File too large (${formatFileSize(f.size)}). Free tier limit is 5MB.`;
    }
    if (f.size === 0) {
      return 'File is empty.';
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const validationError = validateFile(f);
      if (validationError) {
        setError(validationError);
        onFileSelect(null);
        return;
      }
      setError(null);
      onFileSelect(f);
    },
    [validateFile, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [handleFile]
  );

  const removeFile = useCallback(() => {
    onFileSelect(null);
    setError(null);
  }, [onFileSelect]);

  // File type icon color
  const getFileColor = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return 'text-red-500';
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext || '')) return 'text-blue-500';
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'text-green-500';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) return 'text-purple-500';
    if (['zip', 'rar', '7z'].includes(ext || '')) return 'text-yellow-500';
    return 'text-slate-500';
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        File to encrypt
      </label>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && inputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center
              rounded-xl border-2 border-dashed p-8
              transition-colors cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${
                isDragging
                  ? 'border-primary bg-primary-50'
                  : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
              }
            `}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleInputChange}
              disabled={disabled}
            />
            <div
              className={`mb-3 rounded-full p-3 ${
                isDragging ? 'bg-primary-100' : 'bg-slate-100'
              }`}
            >
              <Upload
                className={`h-6 w-6 ${
                  isDragging ? 'text-primary' : 'text-slate-400'
                }`}
              />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {isDragging ? 'Drop file here' : 'Drag & drop a file, or click to select'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Max 5MB &middot; Any file type
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className={`flex-shrink-0 ${getFileColor(file.name)}`}>
              <File className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {file.name}
              </p>
              <p className="text-xs text-slate-500">
                {formatFileSize(file.size)}
              </p>
            </div>
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 text-sm text-error"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
