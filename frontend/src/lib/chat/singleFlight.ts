// Single-flight request deduplication
// Prevents concurrent identical requests

const flights = new Map<string, Promise<any>>();

export function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (flights.has(key)) {
    return flights.get(key)! as Promise<T>;
  }
  
  const promise = fn().finally(() => {
    flights.delete(key);
  });
  
  flights.set(key, promise);
  return promise;
}

export function clearFlight(key: string): void {
  flights.delete(key);
}

export function clearAllFlights(): void {
  flights.clear();
}

export function getActiveFlights(): string[] {
  return Array.from(flights.keys());
}

// Helper for creating chat-specific single flight keys
export function chatFlightKey(chat_type: string, session_id: string, agent_key: string): string {
  return `${chat_type}:${session_id}:${agent_key}`;
}