/// <reference path="../deno-types.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface Medication {
  name: string;
  dosage: string;
}

interface ChatRequest {
  messages: { role: string; content: string }[];
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
    medications?: Medication[];
  };
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action = 'chat', symptoms, drug1, drug2, imageBase64, imageMimeType, userContext } = await req.json() as ChatRequest;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("GEMINI_API_KEY is not configured");
    }

    let personalityPrompt = `You are MedGuide AI, a specialized Clinical Assistant. 
    Your goal is to provide evidence-based healthcare guidance grounded in the user's personal health context.
    
    PERSONA PROTOCOLS:
    1. Always use step-by-step clinical reasoning. Wrap this section in a header: **Clinical Reasoning Process:**
    2. After the reasoning, provide your final answer under a header: **Clinical Guidance:**
    3. Be empathetic but professional and medically accurate.
    4. Ground responses in the provided user profile (age, medications, conditions).
    5. If a query suggests a medical emergency, prioritize advising immediate professional help.
    6. Always state that you are an AI assistant and not a doctor.`;
    
    if (userContext) {
      const { age, gender, bloodType, conditions, allergies, medications } = userContext;
      const conditionsStr = conditions?.length ? conditions.join(', ') : 'none specified';
      const allergiesStr = allergies?.length ? allergies.join(', ') : 'none specified';
      const medsStr = medications?.length 
        ? medications.map(m => `${m.name} (${m.dosage})`).join(', ') 
        : 'none specified';

      personalityPrompt += `\n\nUSER HEALTH PROFILE:
      - Age: ${age || 'unknown'}
      - Gender: ${gender || 'unknown'}
      - Blood Type: ${bloodType || 'unknown'}
      - Chronic Conditions: ${conditionsStr}
      - Allergies: ${allergiesStr}
      - Current Medications: ${medsStr}`;
    }

    // Initialize conversation with personality and context
    const contents: GeminiContent[] = [
      { role: 'user', parts: [{ text: personalityPrompt }] },
      { role: 'model', parts: [{ text: 'I am MedGuide AI, your Clinical Assistant. I have internalized the user health profile and persona protocols. I will provide grounded, step-by-step clinical guidance for all subsequent interactions.' }] },
    ];

    // Handle different actions
    if (action === 'symptoms' && symptoms) {
      contents.push({
        role: 'user',
        parts: [{
          text: `Analyze these symptoms and provide a JSON response: ${symptoms.join(', ')}

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

- Use 'emergency' for any life-threatening symptoms (chest pain, stroke signs, severe difficulty breathing).
- If urgency is 'emergency', the RECOMMENDATIONS must start with calling emergency services (e.g., 911 or local equivalent).
- Use 'high' for conditions requiring urgent care within 24 hours.
- Always err on the side of caution.`
        }]
      });
    } else if (action === 'interactions' && drug1 && drug2) {
      contents.push({
        role: 'user',
        parts: [{
          text: `Check for drug interactions between "${drug1}" and "${drug2}".

Return ONLY valid JSON in this exact format:
{
  "drug1": "${drug1}",
  "drug2": "${drug2}",
  "riskLevel": "low",
  "description": "Description of the interaction or lack thereof",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Risk levels: low (no significant interaction), moderate (use with caution), high (avoid combination)`
        }]
      });
    } else if (action === 'scan' && imageBase64) {
      contents.push({
        role: 'user',
        parts: [
          {
            text: `Analyze this prescription image and extract medication information.
            
            Return ONLY valid JSON in this exact format:
            {
              "medications": [
                {
                  "name": "Medication Name",
                  "dosage": "Dosage amount",
                  "frequency": "How often to take",
                  "time": "Specific time if mentioned, e.g., 09:00, or null if not specified",
                  "instructions": "Additional instructions if any"
                }
              ]
            }
            Extract the exact time if mentioned (e.g. 9 AM -> 09:00). If no time is mentioned, set it to null.`
          },
          { inlineData: { mimeType: imageMimeType || 'image/jpeg', data: imageBase64 } }
        ]
      });
    } else if (messages && messages.length > 0) {
      // Regular chat - add message history
      for (const msg of messages) {
        contents.push({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    console.log("Calling Gemini API with action:", action);

    // Use streaming for chat, non-streaming for structured responses
    if (action === 'chat') {
      const response = await fetch(`${GEMINI_API_URL}/gemini-2.0-flash:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        
        // Parse error for better user messaging
        let errorMessage = "AI service temporarily unavailable";
        if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
        } else if (response.status === 403) {
          errorMessage = "API key issue. Please check your Gemini API key.";
        }
        
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      // Non-streaming for structured responses
      const response = await fetch(`${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            response_mime_type: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        
        let errorMessage = "AI service temporarily unavailable";
        if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
        }
        
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
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