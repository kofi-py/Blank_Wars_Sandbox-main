'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Home } from 'lucide-react';
import MainTabSystem from '@/components/MainTabSystem';
import LogoutButton from '@/components/LogoutButton';

function GameContent() {
  const { user, is_loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');
  const subtab = searchParams.get('subtab');

  useEffect(() => {
    // If not authenticated, redirect to home
    if (!is_loading && !user) {
      router.push('/');
    }
  }, [user, is_loading, router]);

  if (is_loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <LogoutButton />
      {/* Home button */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-4 left-4 z-50 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg shadow-lg transition-colors duration-200 flex items-center gap-2"
        title="Back to Homepage"
      >
        <Home className="w-5 h-5" />
        <span className="hidden sm:inline">Home</span>
      </button>
      <MainTabSystem initial_tab={tab} initial_sub_tab={subtab} />
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}