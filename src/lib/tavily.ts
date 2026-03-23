export interface DoctorEntry {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  address?: string;
  rating: number;
  experience?: number;
  phone: string;
}

export interface HospitalEntry {
  id: string;
  name: string;
  address: string;
  specialties: string[];
  emergency: boolean;
  rating: number;
  phone: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

/**
 * Calls Gemini via the Supabase edge function using 'chat' action (SSE streaming)
 * and collects full response text.
 */
async function callGeminiStreaming(prompt: string): Promise<string> {
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      action: 'chat',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[Gemini] Error response:', err);
    throw new Error(`Gemini error: ${response.status}`);
  }

  // Parse SSE stream
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
          if (text) fullText += text;
        } catch {
          // skip invalid JSON chunks
        }
      }
    }
  }

  return fullText;
}

export async function fetchLiveHealthcareData(
  specialty: string,
  location: string
): Promise<{ doctors: DoctorEntry[]; hospitals: HospitalEntry[] }> {
  try {
    // Step 1: Fetch from Tavily with a very specific query
    console.log('[Tavily] Searching for', specialty, 'in', location);
    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: import.meta.env.VITE_TAVILY_API_KEY,
        query: `best ${specialty} doctors and hospitals in ${location} with name clinic address phone rating experience Practo Justdial`,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 7,
      }),
    });

    if (!tavilyRes.ok) {
      throw new Error(`Tavily API error: ${tavilyRes.status}`);
    }

    const tavilyData = await tavilyRes.json();

    // Build context
    const parts: string[] = [];
    if (tavilyData.answer) parts.push('ANSWER:\n' + tavilyData.answer);
    for (const r of (tavilyData.results || [])) {
      parts.push(`SOURCE: ${r.title}\n${r.content}`);
    }
    const context = parts.join('\n\n---\n\n').substring(0, 4000);
    console.log('[Tavily] Context ready, length:', context.length);

    // Step 2: Send to Gemini for structured extraction
    const prompt = `You are a JSON data extractor. From the search results below, extract real ${specialty} doctors and hospitals in ${location}.

OUTPUT ONLY valid JSON starting with { and ending with }. No markdown, no explanation, no backticks.

Required JSON format:
{
  "doctors": [
    {"id":"d1","name":"Dr. Full Name","specialty":"${specialty}","hospital":"Clinic/Hospital","address":"Area, ${location}","rating":4.5,"experience":15,"phone":"+91 XXXXXXXXXX"}
  ],
  "hospitals": [
    {"id":"h1","name":"Hospital Name","address":"Address, ${location}","specialties":["${specialty}"],"emergency":true,"rating":4.5,"phone":"+91 XXXXXXXXXX"}
  ]
}

RULES:
- Extract ONLY real data from search results. Do NOT invent names.
- Every doctor MUST have a real address/area from the search results.
- Include 3-5 doctors and 2-3 hospitals minimum.
- If phone not found, use "Not available".
- Start response with { — NO other text before or after.

SEARCH RESULTS:
${context}`;

    console.log('[Gemini] Sending extraction prompt...');
    const resultText = await callGeminiStreaming(prompt);
    console.log('[Gemini] Response length:', resultText.length);
    console.log('[Gemini] Response preview:', resultText.substring(0, 200));

    // Parse JSON from response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Parse] No JSON found. Raw text:', resultText.substring(0, 500));
      throw new Error('No JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const doctors: DoctorEntry[] = (parsed.doctors || []).map(
      (d: any, i: number) => ({
        id: `live-d${i}-${Date.now()}`,
        name: d.name || 'Unknown',
        specialty: d.specialty || specialty,
        hospital: d.hospital || 'Unknown',
        address: d.address || location,
        rating: typeof d.rating === 'number' ? d.rating : 4.0,
        experience: d.experience || undefined,
        phone: d.phone || 'Not available',
      })
    );

    const hospitals: HospitalEntry[] = (parsed.hospitals || []).map(
      (h: any, i: number) => ({
        id: `live-h${i}-${Date.now()}`,
        name: h.name || 'Unknown',
        address: h.address || location,
        specialties: Array.isArray(h.specialties) ? h.specialties : [specialty],
        emergency: h.emergency ?? true,
        rating: typeof h.rating === 'number' ? h.rating : 4.0,
        phone: h.phone || 'Not available',
      })
    );

    console.log(`[Result] ${doctors.length} doctors, ${hospitals.length} hospitals`);
    return { doctors, hospitals };
  } catch (err) {
    console.error('[LiveSearch] Failed:', err);
    return { doctors: [], hospitals: [] };
  }
}
