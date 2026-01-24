import apiClient from './apiClient';

export async function createChatCompletion(payload: {
  model?: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
}) {
  const res = await apiClient.post('/ai/chat', payload);
  return res.data as { choices: Array<{ message: { content: string } }> };
}

export const aiChat = createChatCompletion;

export async function createImage(payload: {
  prompt: string;
  negative_prompt?: string;
  size?: "256x256" | "512x512" | "1024x1024" | string;
  n?: number;
  seed?: number;
  format?: "png" | "jpg" | "jpeg" | string;
}) {
  const res = await apiClient.post('/ai/image', payload);
  return res.data as { images: Array<{ mime: string; dataUrl: string }> };
}