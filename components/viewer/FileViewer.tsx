'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Image as ImageIcon, Film, Music, Code, File } from 'lucide-react';
import { formatFileSize } from '@/lib/crypto';

interface FileViewerProps {
  data: ArrayBuffer;
  fileName: string;
  fileType: string;
}

type ViewerType = 'pdf' | 'image' | 'text' | 'video' | 'audio' | 'other';

function getViewerType(mimetype: string, filename: string): ViewerType {
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (
    mimetype.startsWith('text/') ||
    mimetype === 'application/json' ||
    mimetype === 'application/xml' ||
    /\.(txt|md|json|xml|csv|log|js|ts|tsx|jsx|py|rb|go|rs|java|c|cpp|h|css|html|yml|yaml|toml|ini|sh|bash|sql)$/i.test(filename)
  ) return 'text';
  return 'other';
}

function getViewerIcon(type: ViewerType) {
  switch (type) {
    case 'pdf': return FileText;
    case 'image': return ImageIcon;
    case 'video': return Film;
    case 'audio': return Music;
    case 'text': return Code;
    default: return File;
  }
}

export default function FileViewer({ data, fileName, fileType }: FileViewerProps) {
  const viewerType = getViewerType(fileType, fileName);
  const [objectUrl, setObjectUrl] = useState<string>();
  const [textContent, setTextContent] = useState<string>();

  const blob = useMemo(() => new Blob([data], { type: fileType }), [data, fileType]);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => {
    if (viewerType === 'text') {
      blob.text().then(setTextContent);
    }
  }, [blob, viewerType]);

  function handleDownload() {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const ViewerIcon = getViewerIcon(viewerType);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <ViewerIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
          <span className="truncate text-sm font-medium text-slate-900">{fileName}</span>
          <span className="flex-shrink-0 text-xs text-slate-400">{formatFileSize(data.byteLength)}</span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </div>

      {/* Viewer content */}
      <div className="relative min-h-[300px] max-h-[600px] overflow-auto bg-slate-50">
        {viewerType === 'pdf' && objectUrl && (
          <iframe
            src={objectUrl}
            className="h-[600px] w-full border-0"
            title={fileName}
          />
        )}

        {viewerType === 'image' && objectUrl && (
          <div className="flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={objectUrl}
              alt={fileName}
              className="max-h-[560px] max-w-full rounded object-contain"
            />
          </div>
        )}

        {viewerType === 'video' && objectUrl && (
          <div className="flex items-center justify-center p-4">
            <video
              src={objectUrl}
              controls
              className="max-h-[560px] max-w-full rounded"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {viewerType === 'audio' && objectUrl && (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <div className="rounded-full bg-slate-100 p-6">
              <Music className="h-10 w-10 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">{fileName}</p>
            <audio src={objectUrl} controls className="w-full max-w-md">
              Your browser does not support the audio tag.
            </audio>
          </div>
        )}

        {viewerType === 'text' && textContent !== undefined && (
          <pre className="overflow-auto p-4 text-sm leading-relaxed text-slate-800 font-mono whitespace-pre-wrap break-words">
            {textContent}
          </pre>
        )}

        {viewerType === 'other' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="rounded-full bg-slate-100 p-6">
              <File className="h-10 w-10 text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">{fileName}</p>
              <p className="mt-1 text-xs text-slate-500">
                Preview not available for this file type
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download file
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
