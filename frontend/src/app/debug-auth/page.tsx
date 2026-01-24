'use client';

import { useAuth, UserProfile } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface DebugInfo {
  user: UserProfile | null;
  is_loading: boolean;
  is_authenticated: boolean;
  user_exists: boolean;
  timestamp: string;
}

export default function DebugAuth() {
  const { user, is_loading, is_authenticated } = useAuth();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    setDebugInfo({
      user: user,
      is_loading: is_loading,
      is_authenticated: is_authenticated,
      user_exists: !!user,
      timestamp: new Date().toISOString()
    });
  }, [user, is_loading, is_authenticated]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>

      <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">User Object</h2>
          <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Loading States</h2>
          <ul className="space-y-2">
            <li>Is Loading: <span className={is_loading ? 'text-yellow-400' : 'text-green-400'}>{is_loading.toString()}</span></li>
            <li>Is Authenticated: <span className={is_authenticated ? 'text-green-400' : 'text-red-400'}>{is_authenticated.toString()}</span></li>
            <li>User Exists: <span className={!!user ? 'text-green-400' : 'text-red-400'}>{(!!user).toString()}</span></li>
          </ul>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Go to Homepage
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
