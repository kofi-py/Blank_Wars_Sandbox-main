'use client';
import { useState } from 'react';
import { sendChat } from '@/services/chat';

export default function ChatDebugPanel() {
  const [out, setOut] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  
  async function go() {
    setLoading(true);
    try {
      const r = await sendChat(
        'achilles',
        [{ role: 'user', content: 'say hello from UI' }],
        'ui-debug',
        'bw:achilles:ui-debug'
      );
      setOut(r);
    } catch (e: unknown) {
      setOut({ error: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="p-4 border rounded-xl bg-gray-900 text-white">
      <h3 className="text-lg font-bold mb-2">Chat Debug Panel</h3>
      <button 
        onClick={go} 
        disabled={loading}
        className="px-3 py-2 rounded-lg border bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Chat'}
      </button>
      {out && (
        <pre className="mt-3 text-xs whitespace-pre-wrap bg-black p-2 rounded">
          {JSON.stringify(out, null, 2)}
        </pre>
      )}
    </div>
  );
}