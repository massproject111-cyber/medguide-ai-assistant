/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="@types/deno" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { specialist, location } = await req.json();

    if (!specialist) {
      return new Response(JSON.stringify({ error: 'specialist is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const locText = location || "India";

    const prompt = `You are a medical directory assistant. Return a JSON object with real, well-known hospitals and doctors for the specialty "${specialist}" in/near "${locText}".

Return EXACTLY this JSON structure (no markdown, no explanation, just raw JSON):
{
  "hospitals": [
    {
      "name": "Hospital Name",
      "specialisation": "Department/Specialisation",
      "address": "Full address",
      "phone": "Phone number or N/A",
      "rating": 4.5,
      "beds": 200,
      "established": "1990",
      "facilities": ["ICU", "Emergency", "Pharmacy"],
      "mapQuery": "Hospital Name City"
    }
  ],
  "doctors": [
    {
      "name": "Dr. Full Name",
      "specialisation": "Exact specialisation",
      "qualification": "MBBS, MD, etc.",
      "experience": "15 years",
      "hospital": "Hospital they practice at",
      "fee": "₹500-₹1000",
      "rating": 4.3,
      "languages": ["English", "Hindi"],
      "mapQuery": "Doctor Name Hospital City"
    }
  ],
  "summary": "Brief summary of medical facilities available"
}

Rules:
- Return 4-6 hospitals and 4-6 doctors
- Use REAL well-known hospitals and doctors from that area if possible
- Include accurate specialisations relevant to "${specialist}"
- Ratings between 3.5-5.0
- All data should be realistic and helpful
- Return ONLY valid JSON, no markdown code blocks`;

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from AI response (handle possible markdown wrapping)
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify({
      hospitals: parsed.hospitals || [],
      doctors: parsed.doctors || [],
      summary: parsed.summary || `Found medical facilities for ${specialist} in ${locText}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Search doctors error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
