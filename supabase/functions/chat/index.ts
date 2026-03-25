/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="@types/deno" />


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ChatRequest {
  messages?: { role: string; content: string }[];
  action?: 'chat' | 'symptoms' | 'interactions' | 'scan';
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action = 'chat', symptoms, drug1, drug2, imageBase64, imageMimeType, userContext } = await req.json() as ChatRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
      const conditionsStr = userContext.conditions?.length ? userContext.conditions.join(', ') : 'none specified';
      const allergiesStr = userContext.allergies?.length ? userContext.allergies.join(', ') : 'none specified';
      const medsStr = userContext.medications?.length
        ? userContext.medications.map((m: any) => `${m.name} (${m.dosage})`).join(', ')
        : 'none specified';

      systemPrompt += `\n\nUSER HEALTH PROFILE:
- Age: ${userContext.age || 'unknown'}
- Gender: ${userContext.gender || 'unknown'}
- Blood Type: ${userContext.bloodType || 'unknown'}
- Chronic Conditions: ${conditionsStr}
- Allergies: ${allergiesStr}
- Current Medications: ${medsStr}`;
    }

    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Build messages based on action
    if (action === 'symptoms' && symptoms) {
      aiMessages.push({
        role: "user",
        content: `Analyze these symptoms and provide a JSON response: ${symptoms.join(', ')}

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

Provide top 2-3 most likely conditions with confidence percentages. Urgency levels: low, moderate, high, emergency.`
      });
    } else if (action === 'interactions' && drug1 && drug2) {
      aiMessages.push({
        role: "user",
        content: `Check for drug interactions between "${drug1}" and "${drug2}".

Return ONLY valid JSON in this exact format:
{
  "drug1": "${drug1}",
  "drug2": "${drug2}",
  "riskLevel": "low",
  "description": "Description of the interaction or lack thereof",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Risk levels: low (no significant interaction), moderate (use with caution), high (avoid combination)`
      });
    } else if (action === 'scan' && imageBase64) {
      // For image scanning, we use Gemini vision model via the gateway
      aiMessages.push({
        role: "user",
        content: `Analyze this prescription image (base64 encoded, mime type: ${imageMimeType || 'image/jpeg'}) and extract medication information. Make sure to handle messy or unclear handwriting by deducing contextually likely medication names.

### MEDICAL ABBREVIATIONS & CONTEXT TRAINING GUIDE:
Use the following common medical abbreviations to decipher unclear handwriting:
- Frequency: QD (1x daily), BID (2x daily), TID (3x daily), QID (4x daily), Q4H (every 4 hrs), PRN (as needed).
- Route: PO (by mouth), IV (intravenous), IM (intramuscular), SC/SQ (subcutaneous).
- Timing: AC (before meals), PC (after meals), HS (at bedtime), AM (morning), PM (evening).
- Forms: TAB (tablet), CAP (capsule), SYR (syrup), SUSP (suspension), UNG/OINT (ointment), GTT (drops).
If a drug name is scribbled but ends in "-cillin", it's likely a penicillin antibiotic. If it ends in "-olol", it's a beta-blocker. Use your extensive medical training to infer the most likely valid medication name rather than outputting literal gibberish.

The image data is: [IMAGE_DATA_PLACEHOLDER]

Return ONLY valid JSON in this exact format, with no markdown formatting around it:
{
  "doctorName": "Doctor's name if visible, or null",
  "patientName": "Patient's name if visible, or null",
  "date": "Date of prescription if visible, or null",
  "diagnosis": "Mentioned diagnosis/symptoms, or null",
  "advice": "General advice, diet, or next visit date, or null",
  "medications": [
    {
      "name": "Medication Name (if unclear, use medical context to deduce it or provide best guess)",
      "dosage": "Dosage amount",
      "frequency": "How often to take (translate Latin abbreviations into plain English using the guide)",
      "times": ["08:00", "20:00"],
      "duration": "How many days/weeks, or null",
      "instructions": "Additional instructions if any (e.g., Take after meals)",
      "purpose": "Inferred medical purpose/condition this treats based on the medication name, or null if unknown"
    }
  ]
}
For 'times', provide an array of specific taking times in 24-hour HH:MM format (e.g. ["09:00"]). If times aren't explicitly mentioned, but frequency is (e.g. twice a day), deduce logical times like ["08:00", "20:00"]. If totally unknown, return empty array [].`
      });
    } else if (messages && messages.length > 0) {
      for (const msg of messages) {
        aiMessages.push({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          content: msg.content,
        });
      }
    }

    console.log("Calling Lovable AI Gateway with action:", action);

    const useStreaming = action === 'chat';

    // For scan action with image, use Gemini vision model
    let model = "google/gemini-3-flash-preview";
    if (action === 'scan' && imageBase64) {
      model = "google/gemini-2.5-flash";
    }

    // Build request body
    const requestBody: any = {
      model,
      messages: aiMessages,
      stream: useStreaming,
    };

    // For non-chat actions, use tool calling for structured output
    if (action === 'symptoms') {
      requestBody.tools = [{
        type: "function",
        function: {
          name: "analyze_symptoms",
          description: "Return symptom analysis results",
          parameters: {
            type: "object",
            properties: {
              conditions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    confidence: { type: "number" },
                    description: { type: "string" },
                    specialist: { type: "string" },
                  },
                  required: ["name", "confidence", "description", "specialist"],
                },
              },
              recommendations: { type: "array", items: { type: "string" } },
              urgencyLevel: { type: "string", enum: ["low", "moderate", "high", "emergency"] },
            },
            required: ["conditions", "recommendations", "urgencyLevel"],
          },
        },
      }];
      requestBody.tool_choice = { type: "function", function: { name: "analyze_symptoms" } };
    } else if (action === 'interactions') {
      requestBody.tools = [{
        type: "function",
        function: {
          name: "check_interaction",
          description: "Return drug interaction analysis",
          parameters: {
            type: "object",
            properties: {
              drug1: { type: "string" },
              drug2: { type: "string" },
              riskLevel: { type: "string", enum: ["low", "moderate", "high"] },
              description: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["drug1", "drug2", "riskLevel", "description", "recommendations"],
          },
        },
      }];
      requestBody.tool_choice = { type: "function", function: { name: "check_interaction" } };
    }

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (useStreaming) {
      // Stream SSE directly back to client
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      // Parse structured response
      const data = await response.json();
      
      let text = '';
      // Check for tool call response (structured output)
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        text = toolCall.function.arguments;
      } else {
        text = data.choices?.[0]?.message?.content || '';
      }

      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
