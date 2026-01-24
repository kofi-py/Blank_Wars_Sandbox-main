# LocalAI to OpenAI Migration Report
**Date:** October 10, 2025
**Purpose:** Switch from RunPod GPU LocalAI to OpenAI API for cost optimization at current scale

---

## Executive Summary

**Current Setup:**
- Using RunPod GPU (RTX 4090) with llama-cpp-python server
- Fixed cost: ~$0.79/hour = ~$568/month (24/7 operation)
- Model: Llama 3.2 3B Instruct (Q4_K quantized)
- RunPod URL: `https://6t5hu2pzw2x401-8000.proxy.runpod.net`

**Proposed Setup:**
- OpenAI API (gpt-4o-mini recommended for cost)
- Pay-per-use pricing: ~$0.15/1M input tokens, ~$0.60/1M output tokens
- Breakeven point: ~200 daily active users (estimated)
- OpenAI package already installed: `"openai": "^5.8.2"`

**Cost Analysis:**
- Below 200 DAU: OpenAI significantly cheaper
- Above 200 DAU: RunPod GPU becomes more economical
- Current traffic: Well below breakeven threshold

---

## Files Requiring Changes

### 1. **Primary LLM Call Location: `/backend/src/routes/ai.ts`**
   - **15 domain handlers** making direct LocalAI calls via axios
   - **16 axios.post calls** to LocalAI endpoint
   - All handlers follow same pattern:
     ```typescript
     const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';
     const localaiEndpoint = `${LOCALAI_URL}/v1/chat/completions`;
     const llamaResponse = await axios.post(localaiEndpoint, {...})
     ```

   **Domain Handlers to Update:**
   - Line 245: `handleFinancialRequest`
   - Line 426: `handleEquipmentRequest`
   - Line 615: `handleSkillsRequest`
   - Line 788: `handleKitchenTableRequest`
   - Line 979: `handleTrainingRequest`
   - Line 1138: `handleRealEstateRequest`
   - Line 1294: `handleSocialLoungeRequest`
   - Line 1450: `handleMessageBoardRequest`
   - Line 1606: `handleGroupActivitiesRequest`
   - Line 1762: `handlePerformanceRequest`
   - Line 1922: `handlePersonalProblemsRequest`
   - Line 2082: `handleBattleRequest`
   - Line 2259: `handleDramaBoardRequest`
   - Line 2418: `handleTherapyRequest` ⭐ **PRIMARY TARGET**
   - Line 2766: `handleConfessionalRequest`

### 2. **Secondary Service: `/backend/src/services/aiChatService.ts`**
   - Line 18: `const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';`
   - Line 78: `callLocalAI()` method - used for character chat
   - Uses axios for direct LocalAI calls
   - Less critical than ai.ts handlers

### 3. **Transport Abstraction: `/backend/src/services/chatTransport.ts`**
   - Line 25-34: `OpenAIAdapter` class already defined but not implemented
   - Line 94-103: `getTransport()` factory with `CHAT_TRANSPORT` env switch
   - **Already has OpenAI structure** - needs implementation only

### 4. **Configuration Files**

   **Railway Environment Variables (Production):**
   - Current: `LOCALAI_URL=https://6t5hu2pzw2x401-8000.proxy.runpod.net`
   - Change to: `OPENAI_API_KEY=sk-proj-...`
   - Optional: `OPENAI_MODEL=gpt-4o-mini` (default if not set)

   **.env.example (Documentation):**
   - Already has: `OPENAI_API_KEY=sk-your-openai-api-key-here`
   - Add: `LOCALAI_URL=https://6t5hu2pzw2x401-8000.proxy.runpod.net` (commented for restoration)
   - Add: `USE_OPENAI=true` (feature flag for easy switching)

---

## Migration Strategy

### Phase 1: Create OpenAI Service Wrapper
**Goal:** Build a drop-in replacement for LocalAI axios calls

**Create:** `/backend/src/services/openaiService.ts`
```typescript
import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async chatCompletion(params: {
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    stopTokens?: string[];
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: params.prompt }],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens,
      stop: params.stopTokens
    });

    return response.choices[0]?.message?.content || '';
  }
}

export const openaiService = new OpenAIService();
```

### Phase 2: Create LLM Provider Abstraction
**Goal:** Single function to switch between LocalAI and OpenAI

**Create:** `/backend/src/services/llmProvider.ts`
```typescript
import axios from 'axios';
import { openaiService } from './openaiService';

export async function callLLM(params: {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stopTokens?: string[];
}): Promise<string> {
  const useOpenAI = process.env.USE_OPENAI === 'true';

  if (useOpenAI) {
    return await openaiService.chatCompletion(params);
  }

  // Fallback to LocalAI
  const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';
  const response = await axios.post(`${LOCALAI_URL}/v1/chat/completions`, {
    model: 'llama-3.2-3b-instruct',
    messages: [{ role: 'user', content: params.prompt }],
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens,
    stop: params.stopTokens
  }, { timeout: 300000 });

  return response.data.choices[0].message.content.trim();
}
```

### Phase 3: Update All Domain Handlers
**Goal:** Replace axios calls with llmProvider abstraction

**Pattern to apply to all 15 handlers:**
```typescript
// OLD CODE (Lines ~347, 539, 712, etc.)
const llamaResponse = await axios.post(localaiEndpoint, {
  model: process.env.LOCALAI_MODEL || 'llama-3.2-3b-instruct',
  messages: [{ role: 'user', content: finalPrompt }],
  temperature: 0.7,
  frequency_penalty: 0.4,
  stop: uniqueStopTokens
}, {
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' }
});
let responseText = llamaResponse.data.choices[0].message.content.trim();

// NEW CODE
import { callLLM } from '../services/llmProvider';

const responseText = await callLLM({
  prompt: finalPrompt,
  temperature: 0.7,
  stopTokens: uniqueStopTokens
});
```

### Phase 4: Environment Configuration
**Goal:** Set up feature flags and API keys

**Railway Environment Variables:**
```bash
# Production - OpenAI Active
USE_OPENAI=true
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
OPENAI_MODEL=gpt-4o-mini

# Keep for restoration (commented)
# LOCALAI_URL=https://6t5hu2pzw2x401-8000.proxy.runpod.net
```

**Local Development (.env):**
```bash
# Development - Can use either
USE_OPENAI=false
LOCALAI_URL=http://localhost:11435

# Or switch to OpenAI for testing
# USE_OPENAI=true
# OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
```

### Phase 5: Testing & Validation
**Goal:** Verify all domains work with OpenAI

**Test Priority:**
1. ⭐ **Therapy Chat** (highest usage, most critical)
2. Financial, Equipment, Skills (core gameplay)
3. Kitchen Table, Training, Real Estate (social features)
4. Battle, Performance, Personal Problems (engagement features)
5. Social Lounge, Message Board, Drama Board, Group Activities (community)
6. Confessional (reality show feature)

**Test Checklist:**
- [ ] Response quality comparable to LocalAI
- [ ] Response time acceptable (<5 seconds)
- [ ] No formatting issues (stop tokens working)
- [ ] Memory system still functioning
- [ ] Turn counting still accurate
- [ ] Cost tracking implemented

---

## Restoration Instructions

### When to Restore GPU Setup
**Indicators:**
- Daily active users exceed 200
- Monthly OpenAI costs exceed $500
- Need for specialized model features
- Latency requirements demand local inference

### Restoration Steps

1. **Restart RunPod Instance**
   ```bash
   ssh root@103.196.86.104 -p 14529 -i ~/.ssh/id_ed25519
   cd /workspace
   nohup python3 -m llama_cpp.server \
     --model models/model.gguf \
     --n_gpu_layers 33 \
     --n_ctx 4096 \
     --host 0.0.0.0 \
     --port 8000 > server.log 2>&1 &
   ```

2. **Verify GPU Server**
   ```bash
   curl https://6t5hu2pzw2x401-8000.proxy.runpod.net/v1/models
   ```

3. **Update Railway Environment**
   ```bash
   # Switch back to LocalAI
   USE_OPENAI=false
   LOCALAI_URL=https://6t5hu2pzw2x401-8000.proxy.runpod.net

   # Keep OpenAI key for fallback
   # OPENAI_API_KEY=sk-proj-...
   ```

4. **Deploy and Test**
   - Railway will auto-deploy on env var change
   - Test therapy chat first
   - Monitor response times
   - Check GPU utilization

---

## Cost Comparison

### OpenAI Pricing (gpt-4o-mini)
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens
- Average prompt: ~1000 tokens input, ~100 tokens output
- Cost per request: ~$0.00021

**Monthly estimates:**
- 100 requests/day: ~$0.63/month
- 1,000 requests/day: ~$6.30/month
- 5,000 requests/day: ~$31.50/month
- 10,000 requests/day: ~$63/month
- 20,000 requests/day: ~$126/month
- 30,000 requests/day: ~$189/month

### RunPod GPU (RTX 4090)
- Fixed: $0.79/hour
- Monthly: ~$568 (24/7 operation)
- Per-request cost: $0 (already paid)

**Breakeven Analysis:**
- OpenAI breaks even at ~$568/month
- That's ~270,000 requests/month
- Or ~9,000 requests/day
- With 30 requests/user/day: **~300 daily active users**

**Conservative Estimate (as mentioned):**
- With realistic usage patterns: **~200 daily active users**

---

## Implementation Checklist

### Pre-Migration
- [ ] Create backup branch: `git checkout -b pre-openai-migration`
- [ ] Document current LocalAI performance metrics
- [ ] Get OpenAI API key with billing set up
- [ ] Set billing alerts on OpenAI dashboard ($50, $100, $200)

### Code Changes
- [ ] Create `/backend/src/services/openaiService.ts`
- [ ] Create `/backend/src/services/llmProvider.ts`
- [ ] Update 15 domain handlers in `/backend/src/routes/ai.ts`
- [ ] Update `/backend/src/services/aiChatService.ts`
- [ ] Add `USE_OPENAI` env var handling
- [ ] Update `.env.example` with new configuration

### Testing (Staging)
- [ ] Test all 15 domain handlers
- [ ] Verify response quality
- [ ] Check response times
- [ ] Validate memory system
- [ ] Confirm turn counting
- [ ] Load test with concurrent requests

### Deployment
- [ ] Update Railway environment variables
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Track OpenAI usage/costs
- [ ] Monitor response times
- [ ] Collect user feedback

### Post-Migration
- [ ] Set up cost monitoring dashboard
- [ ] Create alerts for unusual usage
- [ ] Document actual costs vs projections
- [ ] Plan GPU restoration threshold

### Documentation
- [ ] Update README with new setup instructions
- [ ] Document environment variables
- [ ] Create runbook for switching between providers
- [ ] Document cost analysis methodology

---

## Risks & Mitigations

### Risk 1: OpenAI API Outages
**Mitigation:** Keep `llmProvider.ts` abstraction to quickly switch back to LocalAI

### Risk 2: Unexpected Cost Spikes
**Mitigation:**
- Set OpenAI billing hard limits
- Implement request rate limiting
- Monitor daily costs

### Risk 3: Response Quality Degradation
**Mitigation:**
- A/B test responses before full migration
- Keep LocalAI available for comparison
- Use gpt-4o-mini (good quality/cost ratio)

### Risk 4: Higher Latency
**Mitigation:**
- OpenAI typically faster than CPU LocalAI
- Monitor p95/p99 latency metrics
- Revert if latency exceeds 5 seconds

### Risk 5: Context Window Limitations
**Mitigation:**
- gpt-4o-mini supports 128k context
- Current prompts well under limit
- Monitor for truncation issues

---

## Recommended Next Steps

1. **Immediate:** Get OpenAI API key and set up billing alerts
2. **Development:** Implement `openaiService.ts` and `llmProvider.ts`
3. **Testing:** Update therapy handler first (highest usage)
4. **Validation:** Test therapy chat thoroughly with OpenAI
5. **Incremental:** Roll out to other domains one by one
6. **Monitor:** Track costs daily for first week
7. **Optimize:** Adjust based on usage patterns

---

## Questions to Resolve

1. **OpenAI Model Choice:**
   - gpt-4o-mini: Best cost/performance (recommended)
   - gpt-4o: Higher quality, 6x more expensive
   - gpt-3.5-turbo: Cheaper but lower quality

2. **Fallback Strategy:**
   - Keep RunPod instance warm but idle?
   - Or spin up on-demand if OpenAI fails?

3. **Monitoring:**
   - Which metrics to track?
   - Cost alerting thresholds?
   - Response quality benchmarks?

---

**End of Report**
