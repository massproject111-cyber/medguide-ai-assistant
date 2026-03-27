// AI Service — direct Gemini API integration

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
    timesPerDay?: number;  // how many times per day to take the medicine
    time?: string;
    duration?: string;     // course duration, e.g. "5 days"
    instructions?: string;
  }[];
}

// Robust JSON extraction: handles markdown code fences and nested objects
function extractJSON(raw: string): string | null {
  if (!raw) return null;
  // Strip code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  // Find first { and last } (handles trailing text)
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end >= start) return raw.slice(start, end + 1);
  return null;
}

// Build Gemini system prompt from user context
function buildSystemPrompt(userContext?: ChatContext): string {
  let systemPrompt = `You are MedGuide AI, a specialized Clinical Assistant.
Your goal is to provide evidence-based healthcare guidance grounded in the user's personal health context.

PERSONA PROTOCOLS:
1. Always use step-by-step clinical reasoning. Wrap this section in a header: **Clinical Reasoning Process:**
2. After the reasoning, provide your final answer under a header: **Clinical Guidance:**
3. Be empathetic but professional and medically accurate.
4. Ground responses in the provided user profile (age, medications, conditions).
5. If a query suggests a medical emergency, prioritize advising immediate professional help.
6. Always state that you are an AI assistant and not a doctor.`;

  if (userContext) {
    const conditionsStr = userContext.conditions?.length ? userContext.conditions.join(", ") : "none specified";
    const allergiesStr = userContext.allergies?.length ? userContext.allergies.join(", ") : "none specified";
    const medsStr = userContext.medications?.length
      ? userContext.medications.map((m: any) => `${m.name} (${m.dosage})`).join(", ")
      : "none specified";

    systemPrompt += `\n\nUSER HEALTH PROFILE:
- Age: ${userContext.age || "unknown"}
- Gender: ${userContext.gender || "unknown"}
- Blood Type: ${userContext.bloodType || "unknown"}
- Chronic Conditions: ${conditionsStr}
- Allergies: ${allergiesStr}
- Current Medications: ${medsStr}`;
  }
  return systemPrompt;
}

interface StreamOptions {
  messages: AIMessage[];
  userContext?: ChatContext;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamChat({ messages, userContext, onDelta, onDone, onError }: StreamOptions) {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    onError("Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env.local");
    return;
  }

  const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
  const GEMINI_MODEL = "gemini-2.0-flash-lite";
  const STREAM_URL = `${GEMINI_BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  // Convert OpenAI-style messages to Gemini content format
  const geminiContents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    let resp = await fetch(STREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(userContext) }] },
        contents: geminiContents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    });

    // Retry once after a short delay on rate limit
    if (resp.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      resp = await fetch(STREAM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: buildSystemPrompt(userContext) }] },
          contents: geminiContents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      });
    }

    if (resp.status === 429) {
      onError("Rate limit exceeded. Please try again in a moment.");
      return;
    }
    if (!resp.ok || !resp.body) {
      const errText = await resp.text().catch(() => "");
      console.error("Gemini stream error:", resp.status, errText);
      onError("AI service temporarily unavailable. Please try again.");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
          if (text) onDelta(text);
        } catch {
          /* skip malformed lines */
        }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream error:", error);
    onError("Connection error. Please check your internet and try again.");
  }
}

async function callNonStreaming(prompt: string): Promise<string> {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured.');

  const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
  const GEMINI_MODEL = "gemini-2.0-flash";
  const URL = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const resp = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error?.message || `Request failed (${resp.status})`);
  }

  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function analyzeSymptoms(symptoms: string[]): Promise<SymptomAnalysis> {
  const prompt = `Analyze these symptoms: ${symptoms.join(", ")}

Return ONLY valid JSON in this exact format:
{
  "conditions": [
    {
      "name": "Condition Name",
      "confidence": 85,
      "description": "Brief description",
      "specialist": "Type of specialist to consult"
    }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "urgencyLevel": "low"
}

Provide top 2-3 most likely conditions with confidence percentages (0-100).
Urgency levels: low | moderate | high | emergency.`;
  const text = await callNonStreaming(prompt);
  const jsonStr = extractJSON(text) || text;
  return JSON.parse(jsonStr);
}

export async function checkDrugInteraction(drug1: string, drug2: string): Promise<DrugInteraction> {
  const prompt = `Check for drug interactions between "${drug1}" and "${drug2}".

Return ONLY valid JSON in this exact format:
{
  "drug1": "${drug1}",
  "drug2": "${drug2}",
  "riskLevel": "low",
  "description": "Description of the interaction or lack thereof",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Risk levels: low (no significant interaction) | moderate (use with caution) | high (avoid combination).`;
  const text = await callNonStreaming(prompt);
  const jsonStr = extractJSON(text) || text;
  return JSON.parse(jsonStr);
}

export async function scanPrescription(imageBase64: string, imageMimeType?: string): Promise<PrescriptionData> {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env.local');
  }

  const mimeType = imageMimeType || 'image/jpeg';
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const extractionPrompt = `You are an expert clinical OCR system with deep pharmacology knowledge.
Carefully read ALL text in this prescription image — including handwritten notes.

Extraction rules:
1. Identify EVERY medication mentioned, even if partially legible.
2. Resolve abbreviations: "Amoxi" → "Amoxicillin", "Para" → "Paracetamol", etc.
3. Map shorthand frequencies:
   OD/QD = 1x/day | BD/BID = 2x/day | TDS/TID = 3x/day | QDS/QID = 4x/day
   SOS/PRN = as needed | HS = at bedtime | AC = before meals | PC = after meals
4. timesPerDay MUST be an integer matching the frequency.
5. Capture duration if written (e.g. "for 5 days", "10 days").
6. Capture special instructions (e.g. "after meals", "with water").
7. ONLY extract what is genuinely present in the image — do NOT invent medicines.
8. If a field is truly unreadable, use null.

Return ONLY valid JSON with no extra text:
{
  "medications": [
    {
      "name": "Full medication name",
      "dosage": "Strength and form (e.g. 500mg tablet)",
      "frequency": "Human-readable frequency (e.g. Twice daily)",
      "timesPerDay": 2,
      "time": "HH:MM 24h format or null",
      "duration": "Course duration or null",
      "instructions": "Special instructions or null"
    }
  ]
}`;

  const attemptScan = async (temperature: number): Promise<PrescriptionData | null> => {
    const resp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: extractionPrompt },
          ],
        }],
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Gemini scan error:', resp.status, errText);
      return null;
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const jsonStr = extractJSON(text) || text;
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed.medications)) return null;
      return parsed as PrescriptionData;
    } catch {
      return null;
    }
  };

  // Strict attempt first, then relaxed
  let result = await attemptScan(0.1);
  if (!result) {
    console.log('Retrying prescription scan with higher temperature...');
    result = await attemptScan(0.4);
  }

  if (!result) {
    throw new Error('Failed to extract prescription data. Please try a clearer image.');
  }

  return result;
}

// Always configured with Lovable AI
export function isAIConfigured(): boolean {
  return true;
}
