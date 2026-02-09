'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lock, Shield, Download } from 'lucide-react';
import FileUpload from './FileUpload';
import RecipientSelector, { type Recipient } from './RecipientSelector';
import ExpirationSelector from './ExpirationSelector';
import EncryptionProgress, { type EncryptionStep } from './EncryptionProgress';
import { createSealFile, type SealFileResult } from '@/lib/crypto';
import { DEMO_MODE } from '@/lib/supabase/client';

export default function EncryptPanel() {
  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [expirationDays, setExpirationDays] = useState(3);

  // Encryption state
  const [step, setStep] = useState<EncryptionStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string>();

  const canEncrypt =
    file !== null &&
    recipients.length > 0 &&
    recipients.every((r) => r.verified) &&
    step === 'idle';

  const isProcessing = step === 'encrypting' || step === 'downloading';

  const [sealFileName, setSealFileName] = useState<string>();

  const handleEncrypt = useCallback(async () => {
    if (!file || recipients.length === 0) return;

    setStep('encrypting');
    setErrorMessage(undefined);

    try {
      // Generate a unique file ID
      const fileId = crypto.randomUUID();

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      // Prepare recipient data for crypto lib
      const recipientInputs = recipients.map((r) => ({
        email: r.email,
        publicKey: r.publicKey,
      }));

      // Encrypt the file client-side
      const sealFile: SealFileResult = await createSealFile(
        file,
        recipientInputs,
        fileId,
        { expiresAt: expiresAt.toISOString() }
      );

      // Package as downloadable .seal file
      setStep('downloading');

      const outputFileName = `${file.name}.seal`;
      setSealFileName(outputFileName);
      const sealBlob = new Blob([JSON.stringify(sealFile)], {
        type: 'application/octet-stream',
      });

      // Trigger browser download
      const url = URL.createObjectURL(sealBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStep('complete');
    } catch (err) {
      setStep('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    }
  }, [file, recipients, expirationDays]);

  const handleReset = useCallback(() => {
    setFile(null);
    setRecipients([]);
    setExpirationDays(3);
    setStep('idle');
    setErrorMessage(undefined);
    setSealFileName(undefined);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-lg"
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary-50 p-1.5">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Encrypt a file
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Files are encrypted in your browser before upload. We never see your data.
          </p>
        </div>

        {/* Demo mode banner */}
        {DEMO_MODE && (
          <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs font-medium text-amber-800">
              Demo mode — Supabase not configured. Using mock recipients and local encryption.
            </p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6 px-6 py-5">
          {step === 'idle' ? (
            <>
              <FileUpload
                file={file}
                onFileSelect={setFile}
                disabled={isProcessing}
              />

              <RecipientSelector
                recipients={recipients}
                onRecipientsChange={setRecipients}
                disabled={isProcessing}
              />

              <ExpirationSelector
                expirationDays={expirationDays}
                onExpirationChange={setExpirationDays}
                disabled={isProcessing}
              />

              {/* Security message */}
              <div className="flex items-center gap-2 rounded-lg bg-primary-50/50 px-3 py-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-xs text-primary-dark">
                  End-to-end encrypted &middot; Zero-knowledge architecture
                </span>
              </div>

              {/* Encrypt button */}
              <button
                onClick={handleEncrypt}
                disabled={!canEncrypt}
                className={`
                  w-full rounded-xl py-3 text-sm font-semibold transition-all
                  ${
                    canEncrypt
                      ? 'bg-primary text-white hover:bg-primary-600 active:bg-primary-700 shadow-md shadow-primary/20'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                <span className="flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" />
                  Encrypt & Download
                </span>
              </button>
            </>
          ) : (
            <EncryptionProgress
              step={step}
              errorMessage={errorMessage}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
