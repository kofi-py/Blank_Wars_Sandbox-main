// Dev-only guard to block direct AI API calls from the browser
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  const origFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String((input as any)?.url ?? input);
    if (/api\.openai\.com|anthropic\.com\/v1/.test(url)) {
      console.warn("🚫 Blocked direct AI call in FE:", url);
      throw new Error("Direct AI API call blocked in dev: use backend /api/ai/*");
    }
    return origFetch(input, init);
  };
}

export {}; // Make this a module