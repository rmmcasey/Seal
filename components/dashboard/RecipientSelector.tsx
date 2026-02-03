'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserCheck, UserX, AlertCircle, Users } from 'lucide-react';
import { searchUsers, type SealUser } from '@/lib/supabase/client';

const MAX_RECIPIENTS = 3; // Free tier

export interface Recipient {
  email: string;
  publicKey: string;
  verified: boolean;
}

interface RecipientSelectorProps {
  recipients: Recipient[];
  onRecipientsChange: (recipients: Recipient[]) => void;
  disabled?: boolean;
}

export default function RecipientSelector({
  recipients,
  onRecipientsChange,
  disabled,
}: RecipientSelectorProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SealUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      setError(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await searchUsers(value);
          // Filter out already-added recipients
          const filtered = results.filter(
            (u) => !recipients.some((r) => r.email === u.email)
          );
          setSuggestions(filtered);
          setShowSuggestions(true);
        } catch {
          setError('Failed to search users');
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [recipients]
  );

  const addRecipient = useCallback(
    (user: SealUser) => {
      if (recipients.length >= MAX_RECIPIENTS) {
        setError(`Free tier supports up to ${MAX_RECIPIENTS} recipients.`);
        return;
      }
      if (recipients.some((r) => r.email === user.email)) {
        setError('Recipient already added.');
        return;
      }

      onRecipientsChange([
        ...recipients,
        {
          email: user.email,
          publicKey: user.public_key,
          verified: true,
        },
      ]);
      setQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setError(null);
    },
    [recipients, onRecipientsChange]
  );

  const removeRecipient = useCallback(
    (email: string) => {
      onRecipientsChange(recipients.filter((r) => r.email !== email));
      setError(null);
    },
    [recipients, onRecipientsChange]
  );

  // Handle enter key to add email directly (if typed manually)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && query.includes('@')) {
        e.preventDefault();
        // Check if the typed email matches a suggestion
        const match = suggestions.find(
          (s) => s.email.toLowerCase() === query.toLowerCase()
        );
        if (match) {
          addRecipient(match);
        } else {
          setError('User not found on Seal. They need an account to receive files.');
        }
      }
    },
    [query, suggestions, addRecipient]
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Recipients
        <span className="ml-2 text-xs font-normal text-slate-500">
          ({recipients.length}/{MAX_RECIPIENTS})
        </span>
      </label>

      {/* Added recipients */}
      <AnimatePresence>
        {recipients.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {recipients.map((r) => (
              <motion.div
                key={r.email}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-2.5 pr-1.5 text-sm"
              >
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary-dark font-medium">{r.email}</span>
                {!disabled && (
                  <button
                    onClick={() => removeRecipient(r.email)}
                    className="ml-0.5 rounded-full p-0.5 text-primary-400 hover:bg-primary-100 hover:text-primary-600 transition-colors"
                    aria-label={`Remove ${r.email}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search input */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="email"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={
              recipients.length >= MAX_RECIPIENTS
                ? 'Max recipients reached'
                : 'Search by email...'
            }
            disabled={disabled || recipients.length >= MAX_RECIPIENTS}
            className={`
              w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-4
              text-sm text-slate-900 placeholder:text-slate-400
              focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
            </div>
          )}
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              {suggestions.map((user) => (
                <button
                  key={user.id}
                  onClick={() => addRecipient(user)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                >
                  <UserCheck className="h-4 w-4 text-success" />
                  <span className="font-medium text-slate-900">{user.email}</span>
                  <span className="ml-auto text-xs text-slate-400">Seal user</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No results message */}
        <AnimatePresence>
          {showSuggestions && !isSearching && query.length >= 2 && suggestions.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
            >
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <UserX className="h-4 w-4" />
                <span>No Seal users found matching &quot;{query}&quot;</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Helper text */}
      {recipients.length === 0 && !error && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="h-3.5 w-3.5" />
          <span>Recipients must have a Seal account to decrypt files</span>
        </div>
      )}

      {/* Error */}
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
