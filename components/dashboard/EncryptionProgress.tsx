'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  Download,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
} from 'lucide-react';

export type EncryptionStep =
  | 'idle'
  | 'encrypting'
  | 'downloading'
  | 'complete'
  | 'error';

interface EncryptionProgressProps {
  step: EncryptionStep;
  errorMessage?: string;
  onReset?: () => void;
}

const STEPS = [
  {
    key: 'encrypting' as const,
    label: 'Encrypting in your browser...',
    icon: Lock,
  },
  {
    key: 'downloading' as const,
    label: 'Downloading .seal file...',
    icon: Download,
  },
  {
    key: 'complete' as const,
    label: 'Sealed! Attach the .seal file to your email.',
    icon: CheckCircle2,
  },
];

export default function EncryptionProgress({
  step,
  errorMessage,
  onReset,
}: EncryptionProgressProps) {
  if (step === 'idle') return null;

  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      {/* Security badge */}
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">
          End-to-end encrypted
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((s, index) => {
          const Icon = s.icon;
          const isActive = s.key === step;
          const isComplete =
            step === 'complete'
              ? true
              : currentIndex > index;
          const isPending = !isActive && !isComplete;

          return (
            <div key={s.key} className="flex items-center gap-3">
              {/* Icon */}
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full
                  transition-colors duration-300
                  ${
                    isComplete
                      ? 'bg-success/10 text-success'
                      : isActive
                      ? 'bg-primary-50 text-primary'
                      : 'bg-slate-100 text-slate-400'
                  }
                `}
              >
                {isActive && step !== 'complete' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm transition-colors duration-300 ${
                  isActive
                    ? 'font-medium text-slate-900'
                    : isComplete
                    ? 'text-slate-600'
                    : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {step === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 rounded-lg bg-error/5 border border-error/20 p-3"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error" />
            <div className="flex-1">
              <p className="text-sm font-medium text-error">Encryption failed</p>
              {errorMessage && (
                <p className="mt-1 text-xs text-error/80">{errorMessage}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Progress bar */}
      {step !== 'error' && step !== 'complete' && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: '0%' }}
            animate={{
              width:
                step === 'encrypting'
                  ? '40%'
                  : step === 'downloading'
                  ? '80%'
                  : '100%',
            }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </div>
      )}

      {/* Complete progress bar */}
      {step === 'complete' && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-success/20">
          <div className="h-full w-full rounded-full bg-success" />
        </div>
      )}

      {/* Reset / Send another */}
      {(step === 'complete' || step === 'error') && onReset && (
        <button
          onClick={onReset}
          className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          {step === 'complete' ? 'Encrypt another file' : 'Try again'}
        </button>
      )}
    </motion.div>
  );
}
