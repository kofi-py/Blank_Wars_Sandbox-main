import client from 'prom-client';

export const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const chat_latency = new client.Histogram({
  name: 'bw_ai_chat_ms',
  help: 'AI chat latency in ms',
  buckets: [100, 250, 500, 1000, 2000, 4000, 6000, 10000, 20000],
  labelNames: ['contestant'],
});

register.registerMetric(chat_latency);