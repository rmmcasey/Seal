'use client';

import { useMemo } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

const MAX_DAYS_FREE = 7;

// Preset options for quick selection
const PRESETS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
];

interface ExpirationSelectorProps {
  expirationDays: number;
  onExpirationChange: (days: number) => void;
  disabled?: boolean;
}

export default function ExpirationSelector({
  expirationDays,
  onExpirationChange,
  disabled,
}: ExpirationSelectorProps) {
  const expirationDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + expirationDays);
    return date;
  }, [expirationDays]);

  const formattedDate = useMemo(() => {
    return expirationDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [expirationDate]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Expiration
      </label>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.days}
            onClick={() => onExpirationChange(preset.days)}
            disabled={disabled}
            className={`
              flex-1 rounded-lg border py-2 text-sm font-medium transition-all
              ${
                expirationDays === preset.days
                  ? 'border-primary bg-primary-50 text-primary ring-2 ring-primary/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Expiration info */}
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
        <span>
          Expires: <span className="font-medium">{formattedDate}</span>
        </span>
      </div>

      {/* Free tier notice */}
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Free tier: max {MAX_DAYS_FREE} day expiration. File is permanently
          deleted after expiration.
        </span>
      </div>
    </div>
  );
}
