'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/login');
      } else {
        setUser(data.session.user);
      }
    };
    getSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex items-center justify-between p-4 bg-white shadow-md">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      </header>
      <main className="p-8">
        <h2 className="mb-6 text-2xl">Welcome, {user.email}</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/host-applications" className="block p-6 text-center transition bg-white rounded-lg shadow-md hover:shadow-lg">
            <h3 className="text-lg font-semibold">Host Applications</h3>
            <p className="text-gray-600">Review and approve new hosts.</p>
          </Link>
          <Link href="/class-approvals" className="block p-6 text-center transition bg-white rounded-lg shadow-md hover:shadow-lg">
            <h3 className="text-lg font-semibold">Class Approvals</h3>
            <p className="text-gray-600">Review and approve new classes.</p>
          </Link>
          <Link href="/payouts" className="block p-6 text-center transition bg-white rounded-lg shadow-md hover:shadow-lg">
            <h3 className="text-lg font-semibold">Process Payouts</h3>
            <p className="text-gray-600">Manage and process host payouts.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}

