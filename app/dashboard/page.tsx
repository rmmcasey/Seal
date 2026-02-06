'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, LogOut, User } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import EncryptPanel from '@/components/dashboard/EncryptPanel';
import { DEMO_MODE } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>();

  useEffect(() => {
    if (DEMO_MODE) {
      setUserEmail('demo@seal.email');
      return;
    }
    const supabase = createClientComponentClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      } else {
        // No valid user - session is stale, sign out and redirect
        supabase.auth.signOut().then(() => {
          router.push('/login');
        });
      }
    });
  }, [router]);

  async function handleLogout() {
    if (DEMO_MODE) return;
    const supabase = createClientComponentClient();
    await supabase.auth.signOut();
    localStorage.removeItem('seal_private_key');
    localStorage.removeItem('seal_user_email');
    router.push('/login');
    router.refresh();
  }

  return (
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
              <Link href="/viewer" className="hover:text-slate-900 transition-colors">Open .seal</Link>
              <span className="cursor-not-allowed text-slate-400">Settings</span>
            </nav>

            <div className="flex items-center gap-3">
              {userEmail && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <User className="h-3.5 w-3.5" />
                  {userEmail}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Log out
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-5xl px-4 py-10">
          <EncryptPanel />
        </main>
    </div>
  );
}
