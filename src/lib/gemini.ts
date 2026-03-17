// Gemini AI Service for MedGuide AI - Uses backend edge function
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
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

export interface ChatContext {
  age?: number;
  gender?: string;
  bloodType?: string;
  conditions?: string[];
  allergies?: string[];
  medications?: any[];
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

class GeminiService {
  // Always configured since we use backend API key
  isConfigured(): boolean {
    return true;
  }

  async streamChat(
    messages: GeminiMessage[], 
    userContext?: ChatContext,
    onDelta?: (text: string) => void
  ): Promise<string> {
    const formattedMessages = messages.map(m => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.parts.map(p => p.text).join('')
    }));

    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: formattedMessages,
        action: 'chat',
        userContext
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to get response');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullText += text;
              onDelta?.(text);
            }
          } catch {
            // Ignore invalid JSON
          }
        }
      }
    }

    return fullText || 'No response generated';
  }

  async analyzeSymptoms(symptoms: string[]): Promise<SymptomAnalysis> {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        action: 'symptoms',
        symptoms
      })
    });

    if (!response.ok) throw new Error('Failed to analyze symptoms');

    const data = await response.json();
    const text = data.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response format');
    
    return JSON.parse(jsonMatch[0]);
  }

  async checkDrugInteraction(drug1: string, drug2: string): Promise<DrugInteraction> {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        action: 'interactions',
        drug1,
        drug2
      })
    });

    if (!response.ok) throw new Error('Failed to check drug interaction');

    const data = await response.json();
    const text = data.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response format');
    
    return JSON.parse(jsonMatch[0]);
  }

  async scanPrescription(imageBase64: string, imageMimeType?: string): Promise<PrescriptionData> {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        action: 'scan',
        imageBase64,
        imageMimeType
      })
    });

    if (!response.ok) throw new Error('Failed to scan prescription');

    const data = await response.json();
    const text = data.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response format');
    
    return JSON.parse(jsonMatch[0]);
  }
}

export const geminiService = new GeminiService();