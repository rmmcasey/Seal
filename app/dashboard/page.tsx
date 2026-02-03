'use client';

import Script from 'next/script';
import { Shield } from 'lucide-react';
import EncryptPanel from '@/components/dashboard/EncryptPanel';

export default function DashboardPage() {
  return (
    <>
      {/* Load seal-crypto.js from public directory */}
      <Script src="/seal-crypto.js" strategy="beforeInteractive" />

      <div className="min-h-screen bg-slate-50">
        {/* Dashboard header */}
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-slate-900">Seal</span>
            </div>
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <span className="font-medium text-primary">Encrypt</span>
              <span className="cursor-not-allowed text-slate-400">Inbox</span>
              <span className="cursor-not-allowed text-slate-400">Settings</span>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-5xl px-4 py-10">
          <EncryptPanel />
        </main>
      </div>
    </>
  );
}
