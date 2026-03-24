import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
    if (!TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY is not configured');
    }

    const { specialist, location } = await req.json();

    if (!specialist) {
      return new Response(JSON.stringify({ error: 'specialist is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const query = location
      ? `${specialist} doctor near ${location} contact address rating`
      : `${specialist} doctor near me contact address rating`;

    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        max_results: 10,
        include_answer: true,
      }),
    });

    if (!tavilyResponse.ok) {
      const errText = await tavilyResponse.text();
      throw new Error(`Tavily API error [${tavilyResponse.status}]: ${errText}`);
    }

    const tavilyData = await tavilyResponse.json();

    // Parse results into structured doctor entries
    const doctors = (tavilyData.results || []).map((result: any, index: number) => ({
      id: `tavily-${index}`,
      title: result.title || 'Unknown',
      url: result.url || '',
      snippet: result.content || '',
      source: extractDomain(result.url || ''),
    }));

    return new Response(JSON.stringify({
      doctors,
      answer: tavilyData.answer || null,
      query,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Search doctors error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}
