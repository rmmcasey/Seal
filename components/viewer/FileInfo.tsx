'use client';

import { Shield, FileText, Clock, User, Calendar, HardDrive } from 'lucide-react';
import { formatFileSize } from '@/lib/crypto';
import type { SealFileResult } from '@/lib/crypto';

interface FileInfoProps {
  sealFile: SealFileResult;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTimeRemaining(expiresAt: string): { label: string; urgent: boolean } | null {
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const diff = exp - now;

  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 1) return { label: `${days} days remaining`, urgent: false };
  if (days === 1) return { label: '1 day remaining', urgent: false };
  if (hours > 1) return { label: `${hours} hours remaining`, urgent: true };
  return { label: 'Less than 1 hour remaining', urgent: true };
}

export default function FileInfo({ sealFile }: FileInfoProps) {
  const { metadata, recipients } = sealFile;
  const expiry = metadata.expiresAt ? getTimeRemaining(metadata.expiresAt) : null;
  const isExpired = metadata.expiresAt && new Date(metadata.expiresAt).getTime() < Date.now();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">File details</h3>

      <div className="space-y-3">
        {/* Filename */}
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Filename</p>
            <p className="text-sm font-medium text-slate-900 break-all">{metadata.filename}</p>
          </div>
        </div>

        {/* Size */}
        <div className="flex items-start gap-3">
          <HardDrive className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Size</p>
            <p className="text-sm text-slate-700">{formatFileSize(metadata.size)}</p>
          </div>
        </div>

        {/* Sent date */}
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Sent</p>
            <p className="text-sm text-slate-700">{formatDate(metadata.timestamp)}</p>
          </div>
        </div>

        {/* Expiration */}
        {metadata.expiresAt && (
          <div className="flex items-start gap-3">
            <Clock className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
              isExpired ? 'text-error' : expiry?.urgent ? 'text-warning' : 'text-slate-400'
            }`} />
            <div>
              <p className="text-xs text-slate-500">Expires</p>
              <p className={`text-sm ${
                isExpired ? 'font-medium text-error' : expiry?.urgent ? 'text-warning' : 'text-slate-700'
              }`}>
                {isExpired
                  ? 'Expired'
                  : `${formatDate(metadata.expiresAt)}${expiry ? ` (${expiry.label})` : ''}`}
              </p>
            </div>
          </div>
        )}

        {/* Recipients */}
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Recipients</p>
            <div className="mt-0.5 space-y-0.5">
              {recipients.map((r) => (
                <p key={r.email} className="text-sm text-slate-700">{r.email}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Security badge */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary-50/50 px-3 py-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-xs text-primary-dark">
          Decrypted locally &middot; Never sent to server
        </span>
      </div>
    </div>
  );
}
