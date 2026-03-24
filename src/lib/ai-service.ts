// AI Service using Lovable AI Gateway via edge function

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  age?: number;
  gender?: string;
  bloodType?: string;
  conditions?: string[];
  allergies?: string[];
  medications?: any[];
}

export interface SymptomAnalysis {
  conditions: {
    name: string;
    confidence: number;
    description: string;
    specialist: string;
  }[];
  recommendations: string[];
  urgencyLevel: 'low' | 'moderate' | 'high' | 'emergency';
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  riskLevel: 'low' | 'moderate' | 'high';
  description: string;
  recommendations: string[];
}

export interface PrescriptionData {
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    time?: string;
    instructions?: string;
  }[];
}

interface StreamOptions {
  messages: AIMessage[];
  userContext?: ChatContext;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamChat({ messages, userContext, onDelta, onDone, onError }: StreamOptions) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        action: 'chat',
        userContext
      }),
    });

    if (resp.status === 429) {
      onError("Rate limit exceeded. Please try again in a moment.");
      return;
    }
    if (resp.status === 402) {
      onError("Usage limit reached. Please try again later.");
      return;
    }
    if (!resp.ok || !resp.body) {
      onError("Failed to start chat. Please try again.");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream error:", error);
    onError("Connection error. Please try again.");
  }
}

async function callNonStreaming(body: Record<string, unknown>): Promise<string> {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Request failed (${resp.status})`);
  }

  const data = await resp.json();
  return data.text || '';
}

export async function analyzeSymptoms(symptoms: string[]): Promise<SymptomAnalysis> {
  const text = await callNonStreaming({ action: 'symptoms', symptoms });
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  return JSON.parse(jsonMatch[0]);
}

export async function checkDrugInteraction(drug1: string, drug2: string): Promise<DrugInteraction> {
  const text = await callNonStreaming({ action: 'interactions', drug1, drug2 });
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  return JSON.parse(jsonMatch[0]);
}

export async function scanPrescription(imageBase64: string, imageMimeType?: string): Promise<PrescriptionData> {
  const text = await callNonStreaming({ action: 'scan', imageBase64, imageMimeType });
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  return JSON.parse(jsonMatch[0]);
}

// Always configured with Lovable AI
export function isAIConfigured(): boolean {
  return true;
}
