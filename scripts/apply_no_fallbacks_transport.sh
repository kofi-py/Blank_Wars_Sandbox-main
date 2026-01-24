#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "==> Creating transport seam (new file)…"
mkdir -p backend/src/services

# -------- chatTransport.ts (new) --------
cat > backend/src/services/chatTransport.ts <<'TS'
// Transport abstraction for chat backends.
// Preserve OpenAI-era contract and swap engines here.
// NOTE: We intentionally throw on errors/timeouts to let the route map to HTTP 5xx/504.

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ChatRequest = {
  agentKey: string;           // your persona/agent identifier
  messages: ChatMessage[];    // same structure as before
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;         // SLA; AbortController honored by adapter
  stream?: boolean;
};
export type ChatResult = { text: string };

export interface ChatTransport {
  sendMessage(req: ChatRequest): Promise<ChatResult>;
  // onChunk: raw text chunks; adapter is responsible for parsing
  sendMessageStream?(req: ChatRequest, onChunk: (chunk: string) => void): Promise<void>;
}

// ---- OpenAI adapter (kept for parity/back-compat). Not default. ----
export class OpenAIAdapter implements ChatTransport {
  constructor(private opts: { apiKey: string; model: string }) {}
  async sendMessage(_req: ChatRequest): Promise<ChatResult> {
    // Implement if/when you want to flip back to OpenAI temporarily.
    throw new Error('OpenAIAdapter not wired in this patch.');
  }
  async sendMessageStream(_req: ChatRequest, _onChunk: (t: string) => void) {
    throw new Error('OpenAIAdapter (stream) not wired in this patch.');
  }
}

// ---- LocalAGI adapter (delegates to your existing LocalAGI HTTP entrypoint or service) ----
// We keep behavior strict: if LocalAGI returns empty/timeout -> throw.
export class LocalAGIAdapter implements ChatTransport {
  constructor(private opts: { baseUrl?: string } = {}) {}
  async sendMessage(req: ChatRequest): Promise<ChatResult> {
    // Delegate to your existing service helper if available to avoid duplicating logic:
    // We try to require lazily to prevent circular deps if tests import this file standalone.
    // Expected helper signatures (adjust inside if yours differ):
    //   localAGIService.sendMessage({ agentKey, messages, maxTokens, temperature, timeoutMs }) -> string
    //   localAGIService.sendMessageStream({...}, (chunk)=>void) -> Promise<void>

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const localAGIService = require('./localAGIService');
    const text: string = await localAGIService.sendMessage({
      agentKey: req.agentKey,
      messages: req.messages,
      maxTokens: req.maxTokens,
      temperature: req.temperature,
      timeoutMs: req.timeoutMs,
    });
    if (!text || !text.trim()) throw new Error('LocalAGI returned no text');
    return { text };
  }
  async sendMessageStream(req: ChatRequest, onChunk: (chunk: string) => void): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const localAGIService = require('./localAGIService');
    if (typeof localAGIService.sendMessageStream !== 'function') {
      throw new Error('localAGIService.sendMessageStream is not available');
    }
    await localAGIService.sendMessageStream({
      agentKey: req.agentKey,
      messages: req.messages,
      maxTokens: req.maxTokens,
      temperature: req.temperature,
      timeoutMs: req.timeoutMs,
    }, onChunk);
  }
}

// Single factory; flips by env
export function getTransport(): ChatTransport {
  const t = (process.env.CHAT_TRANSPORT || 'localagi').toLowerCase();
  if (t === 'openai') {
    return new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    });
  }
  return new LocalAGIAdapter({ baseUrl: process.env.LOCALAGI_URL || 'http://localhost:4000' });
}
TS

echo "==> Prebuild placeholder guard…"
mkdir -p backend/scripts
cat > backend/scripts/prebuild.sh <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
# Block synthetic content in active code paths.
PATTERN='quick reply|thinking\)\.\.\.|warming|primer|fallback'
if rg -n -S "$PATTERN" backend/src | grep -vE '(^#|^//)'; then
  echo "❌ Placeholder text found in active code. Remove it."
  exit 1
fi
BASH
chmod +x backend/scripts/prebuild.sh

echo "==> Wire guard into backend/package.json…"
# idempotent inline edit: add prebuild guard to build script if missing
if ! rg -n '"build": ".*prebuild\.sh' backend/package.json >/dev/null 2>&1; then
  # safe JSON edit via jq if available, else sed fallback
  if command -v jq >/dev/null 2>&1; then
    tmp=$(mktemp)
    jq '.scripts.build |= (if . then "bash scripts/prebuild.sh && " + . else "bash scripts/prebuild.sh && tsc" end)' backend/package.json > "$tmp" && mv "$tmp" backend/package.json
  else
    # naive sed: prepend guard to existing build script or create one
    if rg -n '"build":' backend/package.json >/dev/null 2>&1; then
      sed -i.bak 's/"build": *"\(.*\)"/"build": "bash scripts\\/prebuild.sh \&\& \1"/' backend/package.json
    else
      sed -i.bak 's/"scripts": *{/"scripts": {"build": "bash scripts\\/prebuild.sh \&\& tsc",/' backend/package.json
    fi
  fi
fi

echo "==> Removing synthetic fallbacks in LocalAGI service (pattern-based)…"
# We patch both common names defensively; skip if files are absent.
for f in backend/src/services/localAGIService.ts backend/src/services/localAIService.ts; do
  [[ -f "$f" ]] || continue

  cp "$f" "$f.bak.$(date +%s)"

  # 1) Replace obvious fallback returns in catch blocks with throws.
  #    return this.getFallbackResponse(…); / return getFallbackResponse(…);
  perl -0777 -pe 's/return\s+this\.getFallbackResponse\s*\([^)]*\)\s*;/throw e; \/\/ fail-fast\n/g' -i "$f" || true
  perl -0777 -pe 's/return\s+getFallbackResponse\s*\([^)]*\)\s*;/throw e; \/\/ fail-fast\n/g' -i "$f" || true

  # 2) When webhook/poll yields no content, throw instead of fabricating.
  perl -0777 -pe "s/(Webhook response[^\\n]*no content[^\\n]*\\n\\s*)return\\s+['\"][^'\"]+['\"]\\s*;/$1throw new Error('LocalAGI webhook delivered no content');\n/g" -i "$f" || true
  perl -0777 -pe "s/(Polling timed out[^\\n]*\\n\\s*)return\\s+['\"][^'\"]+['\"]\\s*;/$1throw new Error('LocalAGI poll timeout');\n/g" -i "$f" || true

  # 3) Kill any remaining explicit placeholder literals.
  perl -0777 -pe "s/'\\.{3}\\(quick reply while I\\\\'m thinking\\)\\.{3}'/'__REMOVE__'/g" -i "$f" || true
  perl -0777 -pe "s/'I need a moment to[^']*'/'__REMOVE__'/g" -i "$f" || true
  perl -0777 -pe "s/\"I need a moment to[^\"]*\"/'__REMOVE__'/g" -i "$f" || true
  # replace the magic token with a throw if still present
  perl -0777 -pe "s/__REMOVE__/throw new Error('Synthetic fallback was present; removed');/g" -i "$f" || true

  # 4) Optionally neuter getFallbackResponse() body if present.
  perl -0777 -pe "s/(function\\s+getFallbackResponse\\s*\\([^)]*\\)\\s*\\{)[\\s\\S]*?\\}/\\1\\n  throw new Error('getFallbackResponse is forbidden');\\n}/g" -i "$f" || true
  perl -0777 -pe "s/(getFallbackResponse\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{)[\\s\\S]*?\\}/\\1\\n  throw new Error('getFallbackResponse is forbidden');\\n}/g" -i "$f" || true
done

echo "==> Optional: rewire route to transport (non-destructive, pattern-based)…"
# This keeps your current logic but swaps the call sites to use the transport seam.
AI_ROUTE="backend/src/routes/ai.ts"
if [[ -f "$AI_ROUTE" ]]; then
  cp "$AI_ROUTE" "$AI_ROUTE.bak.$(date +%s)"

  # import getTransport if not present
  if ! rg -n "getTransport" "$AI_ROUTE" >/dev/null 2>&1; then
    awk '
      BEGIN{inserted=0}
      /^import /{ if(!inserted){ print; print "import { getTransport } from '\\''../services/chatTransport'\\'';"; inserted=1; next } }
      { print }
    ' "$AI_ROUTE" > "$AI_ROUTE.tmp" && mv "$AI_ROUTE.tmp" "$AI_ROUTE"
  fi

  # create a single transport instance near top of route handler if missing
  if ! rg -n "const transport = getTransport\\(\\);" "$AI_ROUTE" >/dev/null 2>&1; then
    perl -0777 -pe "s/(router\\.post\\([^)]*=>\\s*\\{)/\\1\\n  const transport = getTransport();/s" -i "$AI_ROUTE" || true
  fi

  # swap typical call sites:
  perl -0777 -pe "s/([a-zA-Z0-9_\\.]+)\\.sendMessageStream\\s*\\(/transport.sendMessageStream(/g" -i "$AI_ROUTE" || true
  perl -0777 -pe "s/([a-zA-Z0-9_\\.]+)\\.sendMessage\\s*\\(/transport.sendMessage(/g" -i "$AI_ROUTE" || true
fi

echo "==> Build (with guard)…"
( cd backend && npm run build )

echo "==> Grep for any remaining placeholders in active code…"
if rg -n -S "quick reply|thinking\\)\\.\\.\\.|warming|primer|fallback" backend/src | grep -vE '(^#|^//)'; then
  echo "❌ Placeholder strings remain. See above hits."
  exit 2
fi

echo "==> Done. Commit when satisfied:"
echo "    git add -A && git commit -m 'Transport seam + fail-fast: remove synthetic fallbacks; add placeholder guard'"