'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginTest() {
  const { login, user, is_loading, is_authenticated } = useAuth();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    try {
      setMessage('Attempting login...');
      await login({ email, password });
      setMessage('Login successful!');
    } catch (error) {
      setMessage(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Login Test</h1>

      <div className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={is_loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded text-white"
        >
          {is_loading ? 'Loading...' : 'Login'}
        </button>

        {message && (
          <div className={`p-3 rounded ${message.includes('failed') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-800 rounded">
        <h2 className="text-xl font-semibold mb-4">Current State</h2>
        <div className="space-y-2">
          <p>Is Loading: <span className={is_loading ? 'text-yellow-400' : 'text-green-400'}>{is_loading.toString()}</span></p>
          <p>Is Authenticated: <span className={is_authenticated ? 'text-green-400' : 'text-red-400'}>{is_authenticated.toString()}</span></p>
          <p>User: <span className={user ? 'text-green-400' : 'text-red-400'}>{user ? user.username : 'None'}</span></p>
        </div>
      </div>
    </div>
  );
}
