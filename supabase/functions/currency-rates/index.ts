import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-refresh-secret"
};

const TARGET_CURRENCIES = [
  "EUR",
  "USD",
  "CAD",
  "MXN",
  "BRL",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "GBP",
  "CHF",
  "DKK",
  "SEK",
  "NOK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "TRY",
  "ISK",
  "JPY",
  "CNY",
  "HKD",
  "SGD",
  "INR",
  "KRW",
  "THB",
  "IDR",
  "MYR",
  "PHP",
  "VND",
  "AED",
  "SAR",
  "ILS"
] as const;

type ExchangeRateResponse = {
  result?: string;
  provider?: string;
  time_last_update_utc?: string;
  base_code?: string;
  rates?: Record<string, number>;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  const configuredSecret = Deno.env.get("CURRENCY_REFRESH_SECRET")?.trim();
  if (configuredSecret) {
    const requestSecret = request.headers.get("x-refresh-secret")?.trim();
    if (requestSecret !== configuredSecret) {
      return json({ error: "Currency refresh is not authorized." }, 401);
    }
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    return json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to refresh currency rates." }, 503);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey);

  const response = await fetch("https://open.er-api.com/v6/latest/EUR", {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    return json({ error: `Currency provider returned ${response.status}.` }, 502);
  }

  const payload = (await response.json()) as ExchangeRateResponse;
  if (payload.result && payload.result !== "success") {
    return json({ error: "Currency provider did not return a successful response." }, 502);
  }

  const rates = payload.rates ?? {};
  const rateDate = resolveRateDate(payload.time_last_update_utc);
  const rows = TARGET_CURRENCIES
    .map((currency) => ({
      base_currency: "EUR",
      currency,
      rate: currency === "EUR" ? 1 : rates[currency],
      rate_date: rateDate,
      provider: payload.provider ?? "open.er-api.com",
      fetched_at: new Date().toISOString()
    }))
    .filter((row) => Number.isFinite(row.rate) && row.rate > 0);

  const { error } = await supabase
    .from("currency_rates")
    .upsert(rows, { onConflict: "base_currency,currency,rate_date" });

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ success: true, rateDate, inserted: rows.length });
});

function resolveRateDate(value: string | undefined): string {
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return date.toISOString().slice(0, 10);
}