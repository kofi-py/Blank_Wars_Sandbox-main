import { io, Socket } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export function makeSocket(path?: string): Socket {
  const socket = io(URL, {
    path: path || '/socket.io',      // must match server
    transports: ['websocket'],       // 🚫 no polling fallback
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 20_000,
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] connect_error', err);
  });

  return socket;
}