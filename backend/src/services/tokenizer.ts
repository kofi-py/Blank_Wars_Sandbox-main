// backend/src/services/tokenizer.ts
import axios from 'axios';
import { encode as gptEncode } from 'gpt-3-encoder';

export interface TokenizerService {
  countGPTTokens(text: string): number;
  countProviderTokens(text: string): Promise<number>;
  calibrateRatio(): Promise<number>;
  getProviderCapFromGPTCap(gpt_cap: number): number;
  getRatio(): number | null;
}

class TokenizerServiceImpl implements TokenizerService {
  private ratio: number | null = null;
  private calibrating: Promise<number> | null = null;

  // If your provider exposes a tokenizer endpoint, set this in env.
  private readonly provider_tokenize_url = process.env.PROVIDER_TOKENIZE_URL || '';
  // Conservative fallback ratio (LLaMA-ish tokenizers tend to be > GPT)
  private readonly default_ratio = Number(process.env.PROVIDER_PER_GPT_RATIO ?? '1.15');

  private readonly SAMPLES = [
    'Hello, how are you feeling today?',
    "Can you tell me about the conflicts you're experiencing with your roommates?",
    'I understand you are dealing with difficult situations in your living arrangements.',
    'What specific incident bothers you the most about your current roommate dynamics?',
    "Let's explore how these conflicts make you feel emotionally and what triggers them."
  ];

  countGPTTokens(text: string): number {
    return gptEncode(text).length;
  }

  async countProviderTokens(text: string): Promise<number> {
    // Preferred: ask the provider to tokenize
    if (this.provider_tokenize_url) {
      try {
        const { data } = await axios.post(this.provider_tokenize_url, { text });
        const tokens = Number(data?.tokens ?? data?.length ?? data?.count);
        if (Number.isFinite(tokens) && tokens > 0) return tokens;
      } catch {
        // fall through to heuristic
      }
    }
    // Heuristic fallback
    const gpt = this.countGPTTokens(text);
    return Math.max(1, Math.ceil(gpt * this.default_ratio));
  }

  async calibrateRatio(): Promise<number> {
    if (this.ratio !== null) return this.ratio;
    if (this.calibrating) return this.calibrating;

    this.calibrating = (async () => {
      const ratios: number[] = [];
      for (const sample of this.SAMPLES) {
        const g = this.countGPTTokens(sample);
        const p = await this.countProviderTokens(sample);
        ratios.push(p / Math.max(1, g));
      }
      // Mean with sanity clamps
      const mean =
        ratios.reduce((s, r) => s + r, 0) / Math.max(1, ratios.length);
      const clamped = Math.min(1.6, Math.max(1.02, mean || this.default_ratio));

      this.ratio = Number.isFinite(clamped) ? clamped : this.default_ratio;
      console.log(
        `🧮 Tokenizer calibration: provider/GPT ratio = ${this.ratio.toFixed(3)} (samples=${ratios
          .map(r => r.toFixed(3))
          .join(', ')})`
      );
      this.calibrating = null;
      return this.ratio;
    })();

    return this.calibrating;
  }

  getProviderCapFromGPTCap(gpt_cap: number): number {
    if (this.ratio === null) {
      throw new Error('Tokenizer not calibrated. Call calibrateRatio() first.');
    }
    // Keep a safety margin to ensure provider never exceeds GPT cap
    return Math.max(1, Math.floor((gpt_cap / this.ratio) * 0.97));
  }

  getRatio(): number | null {
    return this.ratio;
  }
}

let instance: TokenizerService | null = null;

export function getTokenizerService(): TokenizerService {
  if (!instance) instance = new TokenizerServiceImpl();
  return instance;
}

// Call this from your server bootstrap (e.g., app.ts), not at import time.
export async function initializeTokenizer(): Promise<void> {
  try {
    await getTokenizerService().calibrateRatio();
  } catch (e) {
    console.warn('[tokenizer] calibration failed; using defaults:', e);
  }
}