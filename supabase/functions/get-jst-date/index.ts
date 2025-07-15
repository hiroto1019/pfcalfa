// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS settings
const allowedOrigins = [
  "https://pfcalfa.vercel.app",
  "http://localhost:3000",
];

console.log("Hello from Functions!")

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    if (isAllowedOrigin) {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // JST (UTC+9) の現在時刻を取得
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // 9時間
  const jstNow = new Date(now.getTime() + jstOffset);

  // YYYY-MM-DD 形式の文字列に変換
  const year = jstNow.getUTCFullYear();
  const month = String(jstNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstNow.getUTCDate()).padStart(2, '0');
  
  const jstDateString = `${year}-${month}-${day}`;

  const headers = {
    "Content-Type": "application/json",
    ...(isAllowedOrigin && { "Access-Control-Allow-Origin": origin }),
  };

  return new Response(
    JSON.stringify({ date: jstDateString }),
    { headers },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:8080/functions/v1/get-jst-date' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
