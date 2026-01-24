// Simple in-memory waiter for webhook completions.
const waiters = new Map<string, { resolve: (t: string) => void; timer: NodeJS.Timeout }>();

export function awaitMessage(message_id: string, timeout_ms = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      waiters.delete(message_id);
      reject(new Error(`Webhook timeout waiting for ${message_id}`));
    }, timeout_ms);
    waiters.set(message_id, { resolve: (t) => { clearTimeout(timer); waiters.delete(message_id); resolve(t); }, timer });
  });
}

export function deliverMessage(message_id: string, text: string) {
  const w = waiters.get(message_id);
  if (w) w.resolve(text);
}