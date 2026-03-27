import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Google Gemini API ─────────────────────────────────────────────────────────
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-2.0-flash";

interface ChatRequest {
  messages?: { role: string; content: string }[];
  action?: "chat" | "symptoms" | "interactions" | "scan";
  symptoms?: string[];
  drug1?: string;
  drug2?: string;
  imageBase64?: string;
  imageMimeType?: string;
  userContext?: {
    age?: number;
    gender?: string;
    bloodType?: string;
    conditions?: string[];
    allergies?: string[];
    medications?: any[];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured in edge function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      messages,
      action = "chat",
      symptoms,
      drug1,
      drug2,
      imageBase64,
      imageMimeType,
      userContext,
    } = (await req.json()) as ChatRequest;

    // ── Build system prompt ─────────────────────────────────────────────────
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
      const conditionsStr = userContext.conditions?.length
        ? userContext.conditions.join(", ")
        : "none specified";
      const allergiesStr = userContext.allergies?.length
        ? userContext.allergies.join(", ")
        : "none specified";
      const medsStr = userContext.medications?.length
        ? userContext.medications
            .map((m: any) => `${m.name} (${m.dosage})`)
            .join(", ")
        : "none specified";

      systemPrompt += `\n\nUSER HEALTH PROFILE:
- Age: ${userContext.age || "unknown"}
- Gender: ${userContext.gender || "unknown"}
- Blood Type: ${userContext.bloodType || "unknown"}
- Chronic Conditions: ${conditionsStr}
- Allergies: ${allergiesStr}
- Current Medications: ${medsStr}`;
    }

    // ── SCAN: Vision OCR via Gemini ─────────────────────────────────────────
    if (action === "scan" && imageBase64) {
      const mimeType = imageMimeType || "image/jpeg";
      const SCAN_URL = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

      const extractionPrompt = `You are an expert clinical OCR system with deep pharmacology knowledge.
Carefully read ALL text in this prescription image — including handwritten notes.

Extraction rules:
1. Identify EVERY medication mentioned, even if partially legible.
2. Resolve abbreviations: "Amoxi" → "Amoxicillin", "Para" → "Paracetamol", etc.
3. Map shorthand frequencies:
   OD/QD = 1×/day | BD/BID = 2×/day | TDS/TID = 3×/day | QDS/QID = 4×/day
   SOS/PRN = as needed | HS = at bedtime | AC = before meals | PC = after meals
4. timesPerDay MUST be an integer matching the frequency.
5. Capture duration if written (e.g. "for 5 days", "10 days", "1 month").
6. Capture special instructions (e.g. "after meals", "with plenty of water").
7. ONLY extract what is genuinely present — do NOT invent or hallucinate medicines.
8. If a field is truly unreadable, use null.

Return ONLY valid JSON — no preamble, no explanation — exactly:
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

      const attemptScan = async (
        temperature: number
      ): Promise<{ text: string } | null> => {
        const resp = await fetch(SCAN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inlineData: { mimeType, data: imageBase64 } },
                  { text: extractionPrompt },
                ],
              },
            ],
            generationConfig: {
              temperature,
              responseMimeType: "application/json",
            },
          }),
        });

        if (!resp.ok) {
          console.error("Gemini scan error:", resp.status, await resp.text());
          return null;
        }
        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text ? { text } : null;
      };

      let result = await attemptScan(0.1);
      if (!result) {
        console.log("Retrying scan with higher temperature...");
        result = await attemptScan(0.4);
      }

      if (result) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          error: "Failed to extract prescription data. Please try a clearer image.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── SYMPTOMS: Structured JSON via Gemini ────────────────────────────────
    if (action === "symptoms" && symptoms) {
      const prompt = `${systemPrompt}

Analyze these symptoms: ${symptoms.join(", ")}

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

      const resp = await fetch(
        `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!resp.ok)
        throw new Error(`Gemini symptoms error: ${resp.status}`);
      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INTERACTIONS: Drug interaction check ────────────────────────────────
    if (action === "interactions" && drug1 && drug2) {
      const prompt = `${systemPrompt}

Check for drug interactions between "${drug1}" and "${drug2}".

Return ONLY valid JSON in this exact format:
{
  "drug1": "${drug1}",
  "drug2": "${drug2}",
  "riskLevel": "low",
  "description": "Description of the interaction or lack thereof",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Risk levels: low (no significant interaction) | moderate (use with caution) | high (avoid combination).`;

      const resp = await fetch(
        `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!resp.ok)
        throw new Error(`Gemini interactions error: ${resp.status}`);
      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CHAT: Streaming response (Gemini SSE → OpenAI SSE format) ──────────
    if (messages && messages.length > 0) {
      // Convert OpenAI-style messages to Gemini content format
      const geminiContents = messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const streamResp = await fetch(
        `${GEMINI_BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: geminiContents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!streamResp.ok) {
        const errText = await streamResp.text();
        console.error("Gemini chat stream error:", streamResp.status, errText);
        if (streamResp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Transform Gemini SSE → OpenAI-style SSE (frontend unchanged)
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      (async () => {
        try {
          const reader = streamResp.body!.getReader();
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
                const text =
                  json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  // Emit OpenAI-compatible SSE chunk
                  const chunk = JSON.stringify({
                    choices: [{ delta: { content: text } }],
                  });
                  await writer.write(
                    encoder.encode(`data: ${chunk}\n\n`)
                  );
                }
              } catch {
                /* skip malformed lines */
              }
            }
          }
          await writer.write(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Stream transform error:", err);
        } finally {
          writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action or missing parameters." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
