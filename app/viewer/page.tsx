'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ArrowLeft,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SealFileUpload from '@/components/viewer/SealFileUpload';
import FileViewer from '@/components/viewer/FileViewer';
import FileInfo from '@/components/viewer/FileInfo';
import { openSealFile, type SealFileResult, type DecryptedFile } from '@/lib/crypto';
import { DEMO_MODE } from '@/lib/supabase/client';

type ViewerStep =
  | 'upload'
  | 'validating'
  | 'decrypting'
  | 'viewing'
  | 'error';

interface ViewerError {
  title: string;
  message: string;
  icon: 'expired' | 'unauthorized' | 'invalid' | 'generic';
}

export default function ViewerPage() {
  const router = useRouter();
  const [step, setStep] = useState<ViewerStep>('upload');
  const [sealFile, setSealFile] = useState<SealFileResult>();
  const [decryptedFile, setDecryptedFile] = useState<DecryptedFile>();
  const [error, setError] = useState<ViewerError>();
  const [userEmail, setUserEmail] = useState<string>();

  // Get current user email on mount
  useEffect(() => {
    if (DEMO_MODE) {
      setUserEmail('demo@seal.email');
      return;
    }
    const supabase = createClientComponentClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const handleFileLoaded = useCallback(
    async (parsed: unknown, _rawFile: File) => {
      const seal = parsed as SealFileResult;
      setSealFile(seal);

      // --- Validation ---
      setStep('validating');

      // Check: is the file expired?
      if (seal.metadata.expiresAt) {
        const expiry = new Date(seal.metadata.expiresAt).getTime();
        if (Date.now() > expiry) {
          setError({
            title: 'File expired',
            message: `This file expired on ${new Date(seal.metadata.expiresAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}. The sender would need to re-encrypt and send it again.`,
            icon: 'expired',
          });
          setStep('error');
          return;
        }
      }

      // Check: is the current user a recipient?
      const email = userEmail || localStorage.getItem('seal_user_email') || '';
      if (!email) {
        setError({
          title: 'Not logged in',
          message: 'You need to log in to decrypt this file.',
          icon: 'unauthorized',
        });
        setStep('error');
        return;
      }

      const isRecipient = seal.recipients.some(
        (r) => r.email.toLowerCase() === email.toLowerCase()
      );
      if (!isRecipient) {
        setError({
          title: 'Not authorized',
          message: `You (${email}) are not a recipient of this file. Only the listed recipients can decrypt it.`,
          icon: 'unauthorized',
        });
        setStep('error');
        return;
      }

      // --- Decryption ---
      setStep('decrypting');

      try {
        const privateKey = localStorage.getItem('seal_private_key');
        if (!privateKey) {
          setError({
            title: 'Private key not found',
            message: 'Your encryption key was not found on this device. You may need to log in from the device where you created your account.',
            icon: 'generic',
          });
          setStep('error');
          return;
        }

        const result = await openSealFile(seal, email, privateKey);
        setDecryptedFile(result);
        setStep('viewing');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Decryption failed';
        setError({
          title: 'Decryption failed',
          message: message.includes('not a recipient')
            ? `You are not authorized to decrypt this file.`
            : `Could not decrypt the file. ${message}`,
          icon: 'generic',
        });
        setStep('error');
      }
    },
    [userEmail]
  );

  const handleReset = useCallback(() => {
    setSealFile(undefined);
    setDecryptedFile(undefined);
    setError(undefined);
    setStep('upload');
  }, []);

  const errorIcons = {
    expired: Clock,
    unauthorized: XCircle,
    invalid: AlertCircle,
    generic: AlertCircle,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-slate-900">Seal</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <AnimatePresence mode="wait">
          {/* Upload state */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto max-w-lg"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <div className="rounded-lg bg-primary-50 p-1.5">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Open a sealed file
                  </h2>
                </div>
                <p className="mb-5 text-sm text-slate-500">
                  Upload a .seal file you received to decrypt and view its contents.
                </p>
                <SealFileUpload onFileLoaded={handleFileLoaded} />
              </div>
            </motion.div>
          )}

          {/* Validating / Decrypting state */}
          {(step === 'validating' || step === 'decrypting') && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto max-w-lg"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="space-y-4">
                  {/* Validate step */}
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      step === 'validating' ? 'bg-primary-50 text-primary' : 'bg-success/10 text-success'
                    }`}>
                      {step === 'validating' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      step === 'validating' ? 'font-medium text-slate-900' : 'text-slate-600'
                    }`}>
                      Checking access...
                    </span>
                  </div>

                  {/* Decrypt step */}
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      step === 'decrypting'
                        ? 'bg-primary-50 text-primary'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {step === 'decrypting' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      step === 'decrypting' ? 'font-medium text-slate-900' : 'text-slate-400'
                    }`}>
                      Decrypting in your browser...
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: '0%' }}
                    animate={{
                      width: step === 'validating' ? '30%' : '70%',
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  />
                </div>

                {/* Security badge */}
                <div className="mt-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    End-to-end encrypted
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {step === 'error' && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto max-w-lg"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
                {(() => {
                  const Icon = errorIcons[error.icon];
                  return (
                    <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                      error.icon === 'expired' ? 'bg-warning/10' : 'bg-error/10'
                    }`}>
                      <Icon className={`h-7 w-7 ${
                        error.icon === 'expired' ? 'text-warning' : 'text-error'
                      }`} />
                    </div>
                  );
                })()}
                <h3 className="text-lg font-semibold text-slate-900">{error.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{error.message}</p>

                <div className="mt-6 flex gap-3 justify-center">
                  <button
                    onClick={handleReset}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Try another file
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
                  >
                    Back to dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Viewing state */}
          {step === 'viewing' && decryptedFile && sealFile && (
            <motion.div
              key="viewing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                {/* Main viewer */}
                <FileViewer
                  data={decryptedFile.data}
                  fileName={decryptedFile.fileName}
                  fileType={decryptedFile.fileType}
                />

                {/* Sidebar */}
                <div className="space-y-4">
                  <FileInfo sealFile={sealFile} />

                  <button
                    onClick={handleReset}
                    className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Open another file
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
