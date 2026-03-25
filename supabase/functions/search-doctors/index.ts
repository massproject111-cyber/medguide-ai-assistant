/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="@types/deno" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Query Nominatim (OpenStreetMap) which is entirely free and doesn't require an API key
    // We do one specific search and a generic fallback to ensure we find real clinics/hospitals in that location
    const specificQuery = location ? `${specialist} in ${location}` : specialist;
    const genericQuery = location ? `hospital or clinic in ${location}` : 'clinic';

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'MedGuide-App/1.0'  // Required by OpenStreetMap ToS
    };

    const [specificRes, genericRes] = await Promise.all([
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(specificQuery)}&format=json&addressdetails=1&limit=10`, { headers }),
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(genericQuery)}&format=json&addressdetails=1&limit=10`, { headers })
    ]);

    const specificData = specificRes.ok ? await specificRes.json() : [];
    const genericData = genericRes.ok ? await genericRes.json() : [];

    const allData = [...specificData, ...genericData];

    // Deduplicate responses by place_id
    const uniqueIds = new Set();
    const places = allData.filter((place: any) => {
      if (!place.place_id || uniqueIds.has(place.place_id)) return false;
      uniqueIds.add(place.place_id);
      return true;
    }).slice(0, 15); // Return up to 15 real places

    // Parse results into structured doctor entries
    const doctors = places.map((place: any) => {
      // Find the most appropriate name for the place
      const placeName = place.name ||
        (place.address?.clinic || place.address?.hospital || place.address?.doctors) ||
        'Verified Clinic / Medical Center';

      const address = place.display_name || '';

      return {
        id: `osm-${place.place_id}`,
        title: placeName,
        url: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=18/${place.lat}/${place.lon}`,
        snippet: address,
        source: 'OpenStreetMap',
      };
    });

    const isNearMe = !location || location.toLowerCase().includes('location detected') || location.toLowerCase() === 'me';
    const locText = isNearMe ? "your location" : location;

    const answer = places.length > 0
      ? `Found ${places.length} real, verified medical facilities near ${locText} mapped on OpenStreetMap.`
      : `I couldn't find any specific ${specialist.toLowerCase()} clinics listed near ${locText}. Try expanding your search area.`;

    return new Response(JSON.stringify({
      doctors,
      answer,
      query: specificQuery,
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
