const API_BASE = "";

/* ── Types ── */

export interface ImageGenerateRequest {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface ImageGenerateResponse {
  url: string;
  seed: number;
  model: string;
}

export interface VoiceOption {
  name: string;
  short_name: string;
  gender: string;
  locale: string;
  friendly_name: string;
}

export interface RefinePromptResponse {
  original: string;
  enhanced: string;
}

export interface GenerateScriptResponse {
  script: string;
  expressions: string[];
}

export interface STTResponse {
  text: string;
  language: string;
  confidence: number;
}

/* ── Helpers ── */

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ── API Functions ── */

export async function chat(messages: { role: string; content: string }[], systemPrompt?: string): Promise<string> {
  const data = await apiFetch<{ reply: string }>("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system_prompt: systemPrompt }),
  });
  return data.reply;
}

export async function generateImage(req: ImageGenerateRequest): Promise<ImageGenerateResponse> {
  return apiFetch("/api/image/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

export async function generateTTS(req: { text: string; voice?: string; rate?: string; emotion?: string }): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/voice/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "TTS failed" }));
    throw new Error(err.detail || "TTS failed");
  }
  return res.blob();
}

export async function getVoices(): Promise<VoiceOption[]> {
  const data = await apiFetch<{ voices: VoiceOption[] }>("/api/voice/voices");
  return data.voices;
}

export async function refinePrompt(prompt: string): Promise<RefinePromptResponse> {
  return apiFetch("/api/ai/refine-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
}

export async function generateScript(topic: string, style?: string): Promise<GenerateScriptResponse> {
  return apiFetch("/api/ai/generate-script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, style }),
  });
}

export async function speechToText(audioBlob: Blob): Promise<STTResponse> {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.wav");
  const res = await fetch(`${API_BASE}/api/voice/stt`, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "STT failed" }));
    throw new Error(err.detail || "STT failed");
  }
  return res.json();
}
