'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'generating' | 'done' | 'confirm-email'>('form');
  const [error, setError] = useState<string>();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed — no user returned');

      // Check if email confirmation is required
      // When confirm email is enabled, identities will be empty or session will be null
      const needsConfirmation =
        !authData.session ||
        (authData.user.identities && authData.user.identities.length === 0);

      // 2. Generate RSA-2048 key pair in the browser
      setStep('generating');

      const sc = (window as unknown as Record<string, unknown>).SealCrypto as
        Record<string, (...args: unknown[]) => unknown>;

      if (!sc) throw new Error('Crypto library not loaded');

      const keyPair = (await sc.generateKeyPair()) as CryptoKeyPair;
      const publicKey = (await sc.exportKey(keyPair.publicKey, 'spki')) as string;
      const privateKey = (await sc.exportKey(keyPair.privateKey, 'pkcs8')) as string;

      // 3. Encrypt the private key with the user's password
      const encryptedKeyData = (await sc.encryptPrivateKeyWithPassword(privateKey, password)) as {
        encryptedKey: string;
        salt: string;
        iv: string;
      };

      // 4. Store public key in profiles table + encrypted private key in user_metadata
      const profileRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          email: email.toLowerCase(),
          publicKey,
          encryptedPrivateKey: encryptedKeyData.encryptedKey,
          salt: encryptedKeyData.salt,
          iv: encryptedKeyData.iv,
        }),
      });

      if (!profileRes.ok) {
        const { error: profileError } = await profileRes.json();
        throw new Error(profileError || 'Failed to create profile');
      }

      // 5. Store email for quick lookup (private key stays server-side)
      localStorage.setItem('seal_user_email', email.toLowerCase());

      if (needsConfirmation) {
        setStep('confirm-email');
      } else {
        setStep('done');
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      setStep('form');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-slate-900">Seal</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Create your account and encryption keys
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            {step === 'generating' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                  <KeyRound className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Generating your encryption keys...
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Creating an RSA-2048 key pair in your browser.
                  <br />
                  Your private key never leaves this device.
                </p>
                <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-primary" />
              </motion.div>
            )}

            {step === 'confirm-email' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Check your email
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  We sent a confirmation link to <span className="font-medium text-slate-700">{email}</span>.
                  <br />
                  Click the link to activate your account and start encrypting.
                </p>
                <p className="mt-4 text-xs text-slate-400">
                  Your encryption keys have been generated and saved locally.
                </p>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <Lock className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Account created!
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Your encryption keys have been generated. Redirecting to dashboard...
                </p>
              </motion.div>
            )}

            {step === 'form' && (
              <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Min 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Repeat password"
                  />
                </div>

                {/* Security note */}
                <div className="flex items-start gap-2 rounded-lg bg-primary-50/50 px-3 py-2">
                  <KeyRound className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="text-xs text-primary-dark">
                    An RSA-2048 key pair will be generated in your browser. Your private key is stored locally and never sent to our servers.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-600 active:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  ) : (
                    'Create account'
                  )}
                </button>

                <p className="text-center text-sm text-slate-500">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-primary hover:text-primary-dark">
                    Log in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </motion.div>
    </div>
  );
}
