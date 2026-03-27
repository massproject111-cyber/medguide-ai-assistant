const TAVILY_KEY = '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';
const SUPABASE_URL = 'https://aybcaibarqbssktrmacl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5YmNhaWJhcnFic3NrdHJtYWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNTc3MDAsImV4cCI6MjA4MTkzMzcwMH0.P-MVcSwvpNB5GKvxli990XSB0rKFwELiU5T3nUIQZ2E';

async function run() {
  // Step 1: Tavily
  console.log('== STEP 1: Tavily ==');
  const tavilyRes = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query: 'best Cardiologist doctors in Kochi name hospital address phone rating Practo Justdial',
      search_depth: 'advanced',
      include_answer: true,
      max_results: 5,
    }),
  });
  const tavilyData = await tavilyRes.json();
  const context = [
    tavilyData.answer || '',
    ...(tavilyData.results || []).map(x => `${x.title}:\n${x.content.substring(0, 400)}`),
  ].join('\n\n').substring(0, 3000);
  
  console.log('Tavily OK. Context length:', context.length);
  console.log('Context preview:', context.substring(0, 300));

  // Step 2: Gemini via Supabase Edge Function
  console.log('\n== STEP 2: Gemini ==');
  const prompt = `Extract cardiologist doctors in Kochi from the search results below. Return ONLY a JSON object (no markdown):
{"doctors":[{"id":"d1","name":"Dr Full Name","specialty":"Cardiologist","hospital":"Hospital Name","address":"Area, Kochi","rating":4.5,"experience":10,"phone":"+91 XXXXXXXXXX"}]}

SEARCH RESULTS:
${context}`;

  const geminiRes = await fetch(SUPABASE_URL + '/functions/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      action: 'chat',
    }),
  });

  console.log('Gemini response status:', geminiRes.status);
  const rawText = await geminiRes.text();
  console.log('Raw response:', rawText.substring(0, 800));
}

run().catch(e => console.error('ERROR:', e.message));
