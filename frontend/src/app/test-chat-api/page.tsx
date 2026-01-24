import ChatDebugPanel from '@/components/ChatDebugPanel';

export default function TestChatAPI() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Test Chat API</h1>
      <ChatDebugPanel />
    </div>
  );
}