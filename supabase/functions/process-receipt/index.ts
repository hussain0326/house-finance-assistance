import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isDemoAccount } from "../_shared/demo-account.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const DEMO_RECEIPT_SCANS_PER_HOUR = 5;

type ExtractedReceipt = {
  merchant: string | null;
  merchantAddress: string | null;
  merchantCity: string | null;
  merchantPostalCode: string | null;
  date: string | null;
  currency: string | null;
  totalAmount: number | null;
  category: string | null;
  countryCode: string | null;
  countryName: string | null;
};

type CurrencyConversion = {
  amount: number | null;
  currency: string;
  originalAmount: number | null;
  originalCurrency: string | null;
  exchangeRate: number | null;
};

type OpenAiErrorBody = {
  error?: {
    message?: string;
  };
};

const SUPPORTED_DEFAULT_CURRENCIES = [
  'EUR',
  'USD',
  'CAD',
  'MXN',
  'BRL',
  'ARS',
  'CLP',
  'COP',
  'PEN',
  'GBP',
  'CHF',
  'DKK',
  'SEK',
  'NOK',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'BGN',
  'TRY',
  'ISK',
  'JPY',
  'CNY',
  'HKD',
  'SGD',
  'INR',
  'KRW',
  'THB',
  'IDR',
  'MYR',
  'PHP',
  'VND',
  'AED',
  'SAR',
  'ILS'
] as const;

const CURRENCY_ALIASES: Record<string, string> = {
  '€': 'EUR',
  EURO: 'EUR',
  EUROS: 'EUR',
  '$': 'USD',
  DOLLAR: 'USD',
  DOLLARS: 'USD',
  '£': 'GBP',
  POUND: 'GBP',
  POUNDS: 'GBP',
  KR: 'DKK',
  'KR.': 'DKK',
  DKR: 'DKK',
  KRONER: 'DKK',
  'DANISH KRONE': 'DKK',
  'DANISH KRONER': 'DKK',
  'SWEDISH KRONA': 'SEK',
  'SWEDISH KRONOR': 'SEK',
  'NORWEGIAN KRONE': 'NOK',
  'NORWEGIAN KRONER': 'NOK'
};

const KNOWN_CATEGORIES = [
  'Groceries',
  'Restaurant',
  'Transport',
  'Utilities',
  'Healthcare',
  'Clothing',
  'Entertainment',
  'Travel',
  'Education',
  'Subscriptions',
  'Other'
];

const RECEIPT_EXTRACTION_PROMPT = `Extract receipt data. Return only JSON with merchant, merchantAddress, merchantCity, merchantPostalCode, date (YYYY-MM-DD or null), currency (ISO code printed on the receipt or null), totalAmount (number in the printed receipt currency or null), category (one of: ${KNOWN_CATEGORIES.join(", ")}, or null if unclear), countryCode (ISO 3166-1 alpha-2 code or null), and countryName (English country name or null). Use address lines printed under or near the merchant for merchantAddress, merchantCity, and merchantPostalCode. Use the printed transaction date near the merchant, amount, or payment time; read the full 4-digit year carefully and do not confuse similar digits such as 2 and 6. If multiple dates appear, prefer the receipt transaction date over card terminal/reference numbers. Infer country primarily from merchantAddress, merchantCity, postal code, printed language, and then currency: København/Danmark/DKK means DK Denmark, Berlin/Deutschland means DE Germany, Paris/France means FR France, London/UK/GBP means GB United Kingdom. Categorize bookstores and books as Education, trains/metro/taxis/fuel/parking as Transport, supermarkets as Groceries, cafes/restaurants/bakeries as Restaurant, pharmacies/clinics as Healthcare, fashion/shoes as Clothing, hotels/flights as Travel, streaming/software memberships as Subscriptions, and cinemas/concerts/games as Entertainment. Never convert currencies and never guess missing values.`;

const KNOWN_COUNTRIES: Record<string, string> = {
  AE: 'United Arab Emirates',
  AT: 'Austria',
  AU: 'Australia',
  BE: 'Belgium',
  CA: 'Canada',
  CH: 'Switzerland',
  CN: 'China',
  CZ: 'Czechia',
  DE: 'Germany',
  DK: 'Denmark',
  ES: 'Spain',
  FR: 'France',
  GB: 'United Kingdom',
  GR: 'Greece',
  HK: 'Hong Kong',
  HU: 'Hungary',
  ID: 'Indonesia',
  IE: 'Ireland',
  IN: 'India',
  IT: 'Italy',
  JP: 'Japan',
  KR: 'South Korea',
  MX: 'Mexico',
  MY: 'Malaysia',
  NL: 'Netherlands',
  NO: 'Norway',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SA: 'Saudi Arabia',
  SE: 'Sweden',
  SG: 'Singapore',
  TH: 'Thailand',
  TR: 'Turkey',
  US: 'United States',
  VN: 'Vietnam'
};

const COUNTRY_RULES: { code: string; keywords: string[] }[] = [
  { code: 'DK', keywords: ['københavn', 'kobenhavn', 'copenhagen', 'danmark', 'denmark', 'dkk'] },
  { code: 'DE', keywords: ['berlin', 'hamburg', 'munich', 'münchen', 'deutschland', 'germany', 'gmbh'] },
  { code: 'FR', keywords: ['paris', 'france'] },
  { code: 'GB', keywords: ['london', 'united kingdom', 'great britain', 'gbp'] },
  { code: 'GR', keywords: ['athens', 'greece', 'hellas'] },
  { code: 'US', keywords: ['united states', 'usa', 'usd'] },
  { code: 'CA', keywords: ['canada', 'cad'] },
  { code: 'AU', keywords: ['australia', 'sydney', 'melbourne', 'aud'] },
  { code: 'SE', keywords: ['stockholm', 'sweden', 'sverige', 'sek'] },
  { code: 'NO', keywords: ['oslo', 'norway', 'norge', 'nok'] },
  { code: 'CH', keywords: ['switzerland', 'schweiz', 'zurich', 'zürich', 'chf'] },
  { code: 'NL', keywords: ['netherlands', 'amsterdam'] },
  { code: 'IT', keywords: ['italy', 'roma', 'rome', 'milano'] },
  { code: 'ES', keywords: ['spain', 'madrid', 'barcelona'] },
  { code: 'IN', keywords: ['india', 'inr'] },
  { code: 'JP', keywords: ['japan', 'tokyo', 'jpy'] },
  { code: 'KR', keywords: ['south korea', 'korea', 'seoul', 'krw'] },
  { code: 'CN', keywords: ['china', 'beijing', 'shanghai', 'cny'] },
  { code: 'HK', keywords: ['hong kong', 'hkd'] },
  { code: 'SG', keywords: ['singapore', 'sgd'] },
  { code: 'TH', keywords: ['thailand', 'bangkok', 'thai baht', 'thb'] },
  { code: 'ID', keywords: ['indonesia', 'bali', 'jakarta', 'idr'] },
  { code: 'MY', keywords: ['malaysia', 'kuala lumpur', 'myr'] },
  { code: 'VN', keywords: ['vietnam', 'hanoi', 'ho chi minh', 'vnd'] },
  { code: 'AE', keywords: ['united arab emirates', 'dubai', 'abu dhabi', 'aed'] },
  { code: 'SA', keywords: ['saudi arabia', 'riyadh', 'jeddah', 'sar'] },
  { code: 'TR', keywords: ['turkey', 'turkiye', 'istanbul', 'try'] },
  { code: 'MX', keywords: ['mexico', 'mexico city', 'mxn'] },
  { code: 'PT', keywords: ['portugal', 'lisbon', 'porto'] },
  { code: 'IE', keywords: ['ireland', 'dublin'] },
  { code: 'AT', keywords: ['austria', 'vienna', 'wien'] },
  { code: 'BE', keywords: ['belgium', 'brussels'] },
  { code: 'PL', keywords: ['poland', 'warsaw', 'krakow', 'pln'] },
  { code: 'CZ', keywords: ['czech', 'czechia', 'prague', 'czk'] },
  { code: 'HU', keywords: ['hungary', 'budapest', 'huf'] },
  { code: 'RO', keywords: ['romania', 'bucharest', 'ron'] }
];

const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  {
    category: 'Groceries',
    keywords: ['aldi', 'lidl', 'rewe', 'edeka', 'netto', 'penny', 'kaufland', 'spar', 'fotex', 'føtex', 'bilka', 'meny', 'coop', 'supermarket', 'grocery', 'groceries', 'market']
  },
  {
    category: 'Restaurant',
    keywords: ['restaurant', 'cafe', 'café', 'bar', 'bistro', 'bakery', 'pizza', 'burger', 'kebab', 'mcdonald', 'kfc', 'starbucks', 'namaste', 'crobag', 'junk food', 'slurp']
  },
  {
    category: 'Transport',
    keywords: ['bahn', 'db ', 'deutsche bahn', 'dsb', 'train', 'metro', 'tram', 'bus', 'taxi', 'uber', 'lyft', 'parking', 'fuel', 'shell', 'aral', 'esso', 'københavn h', 'kobenhavn h', 'copenhagen central']
  },
  {
    category: 'Utilities',
    keywords: ['utility', 'electricity', 'water', 'gas', 'internet', 'telekom', 'vodafone', 'telefonica', 'o2', 'mobile', 'broadband']
  },
  {
    category: 'Healthcare',
    keywords: ['apotheke', 'pharmacy', 'hospital', 'clinic', 'doctor', 'dental', 'dentist', 'medication', 'healthcare']
  },
  {
    category: 'Clothing',
    keywords: ['h&m', 'zara', 'uniqlo', 'primark', 'zalando', 'nike', 'adidas', 'clothing', 'fashion', 'apparel', 'shoes']
  },
  {
    category: 'Entertainment',
    keywords: ['cinema', 'movie', 'theater', 'theatre', 'concert', 'ticketmaster', 'museum', 'game', 'games', 'spotify', 'netflix']
  },
  {
    category: 'Travel',
    keywords: ['hotel', 'hostel', 'airbnb', 'booking.com', 'expedia', 'airline', 'flight', 'airport', 'lufthansa', 'ryanair', 'easyjet']
  },
  {
    category: 'Education',
    keywords: ['hugendubel', 'bookstore', 'book store', 'books', 'buch', 'bücher', 'school', 'university', 'course', 'udemy', 'coursera']
  },
  {
    category: 'Subscriptions',
    keywords: ['subscription', 'monthly plan', 'annual plan', 'membership', 'github', 'microsoft', 'apple', 'google', 'icloud', 'dropbox', 'adobe']
  }
];

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return json({ error: "Authentication is required." }, 401);
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    return json({ error: "OCR is not configured. Add OPENAI_API_KEY to Supabase Edge Function secrets." }, 503);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } }
  );

  const { receiptId } = await request.json();
  if (typeof receiptId !== "string" || !receiptId) {
    return json({ error: "A receipt ID is required." }, 400);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "Authentication is required." }, 401);
  }

  if (isDemoAccount(userData.user.email)) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userData.user.id)
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= DEMO_RECEIPT_SCANS_PER_HOUR) {
      return json({ error: "The demo account has reached its scan limit for this hour. Please try again later." }, 429);
    }
  }

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select("id, image_url, country_code, country_name")
    .eq("id", receiptId)
    .eq("user_id", userData.user.id)
    .single();

  if (receiptError || !receipt) {
    return json({ error: "Receipt not found." }, 404);
  }

  await supabase.from("receipts").update({ processing_status: "processing" }).eq("id", receiptId);

  try {
    const { data: image, error: imageError } = await supabase.storage
      .from("receipt-images")
      .download(receipt.image_url);
    if (imageError || !image) {
      throw new Error("The private receipt image could not be read.");
    }

    const fileType = image.type || inferContentType(receipt.image_url);
    if (!fileType.startsWith("image/") && fileType !== "application/pdf") {
      throw new Error("OCR currently supports PNG, JPG, and PDF receipt files.");
    }

    const fileBase64 = arrayBufferToBase64(await image.arrayBuffer());
    const content = fileType === "application/pdf"
      ? await extractReceiptFromPdf(openAiKey, fileBase64)
      : await extractReceiptFromImage(openAiKey, fileBase64, fileType);
    const extracted = normalizeExtraction(JSON.parse(content ?? "{}"));
    const resolvedCategory = resolveCategory(extracted);
    const resolvedCountry = resolveCountry(extracted, {
      code: typeof receipt.country_code === "string" ? receipt.country_code : null,
      name: typeof receipt.country_name === "string" ? receipt.country_name : null
    });
    const defaultCurrency = normalizeDefaultCurrency(userData.user.user_metadata?.default_currency);
    const conversion = await convertCurrency(supabase, extracted.totalAmount, extracted.currency, defaultCurrency);

    let categoryId: string | null = null;
    if (resolvedCategory) {
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("name", resolvedCategory)
        .maybeSingle();
      categoryId = category?.id ?? null;
    }

    const { error: updateError } = await supabase
      .from("receipts")
      .update({
        merchant_name: extracted.merchant,
        merchant_address: extracted.merchantAddress,
        merchant_city: extracted.merchantCity,
        merchant_postal_code: extracted.merchantPostalCode,
        receipt_date: extracted.date,
        total_amount: conversion.amount,
        currency: conversion.currency,
        original_total_amount: conversion.originalAmount,
        original_currency: conversion.originalCurrency,
        exchange_rate: conversion.exchangeRate,
        category_id: categoryId,
        country_code: resolvedCountry.code,
        country_name: resolvedCountry.name,
        processing_status: "processed"
      })
      .eq("id", receiptId)
      .eq("user_id", userData.user.id);

    if (updateError) {
      throw new Error("OCR completed, but the receipt could not be updated.");
    }

    return json({
      success: true,
      receipt: {
        ...extracted,
        category: resolvedCategory,
        countryCode: resolvedCountry.code,
        countryName: resolvedCountry.name,
        totalAmount: conversion.amount,
        currency: conversion.currency,
        originalTotalAmount: conversion.originalAmount,
        originalCurrency: conversion.originalCurrency,
        exchangeRate: conversion.exchangeRate
      }
    });
  } catch (error) {
    await supabase
      .from("receipts")
      .update({ processing_status: "failed" })
      .eq("id", receiptId)
      .eq("user_id", userData.user.id);
    return json({ error: error instanceof Error ? error.message : "OCR processing failed." }, 422);
  }
});

function normalizeExtraction(value: Partial<ExtractedReceipt>): ExtractedReceipt {
  const amount = Number(value.totalAmount);
  return {
    merchant: typeof value.merchant === "string" ? value.merchant.trim() || null : null,
    merchantAddress: typeof value.merchantAddress === "string" ? value.merchantAddress.trim() || null : null,
    merchantCity: typeof value.merchantCity === "string" ? value.merchantCity.trim() || null : null,
    merchantPostalCode: typeof value.merchantPostalCode === "string" ? value.merchantPostalCode.trim() || null : null,
    date: typeof value.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date) ? value.date : null,
    currency: typeof value.currency === "string" ? value.currency.trim().toUpperCase() || null : null,
    totalAmount: Number.isFinite(amount) && amount >= 0 ? amount : null,
    category: typeof value.category === "string" && KNOWN_CATEGORIES.includes(value.category) ? value.category : null,
    countryCode: typeof value.countryCode === "string" ? value.countryCode.trim().toUpperCase() || null : null,
    countryName: typeof value.countryName === "string" ? value.countryName.trim() || null : null
  };
}

async function extractReceiptFromImage(openAiKey: string, imageBase64: string, imageType: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: RECEIPT_EXTRACTION_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this receipt." },
            { type: "image_url", image_url: { url: `data:${imageType};base64,${imageBase64}` } }
          ]
        }
      ]
    })
  });

  await assertOpenAiOk(response, "OCR provider");
  const completion = await response.json();
  return completion.choices?.[0]?.message?.content ?? "{}";
}

async function extractReceiptFromPdf(openAiKey: string, pdfBase64: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: RECEIPT_EXTRACTION_PROMPT }]
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Read this receipt PDF." },
            {
              type: "input_file",
              filename: "receipt.pdf",
              file_data: `data:application/pdf;base64,${pdfBase64}`
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "receipt_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              merchant: { type: ["string", "null"] },
              merchantAddress: { type: ["string", "null"] },
              merchantCity: { type: ["string", "null"] },
              merchantPostalCode: { type: ["string", "null"] },
              date: { type: ["string", "null"] },
              currency: { type: ["string", "null"] },
              totalAmount: { type: ["number", "null"] },
              category: { type: ["string", "null"], enum: [...KNOWN_CATEGORIES, null] },
              countryCode: { type: ["string", "null"] },
              countryName: { type: ["string", "null"] }
            },
            required: ["merchant", "merchantAddress", "merchantCity", "merchantPostalCode", "date", "currency", "totalAmount", "category", "countryCode", "countryName"]
          }
        }
      }
    })
  });

  await assertOpenAiOk(response, "PDF OCR provider");
  const completion = await response.json();
  return extractResponseText(completion);
}

async function assertOpenAiOk(response: Response, label: string): Promise<void> {
  if (response.ok) {
    return;
  }

  const errorBody = (await response.json().catch(() => null)) as OpenAiErrorBody | null;
  const providerMessage = errorBody?.error?.message;
  if (response.status === 429) {
    throw new Error(
      providerMessage?.toLowerCase().includes("quota")
        ? `${label} quota exceeded. Check the OpenAI account billing/plan.`
        : `${label} is rate limited. Please try again in a moment.`
    );
  }
  throw new Error(providerMessage ? `${label} error: ${providerMessage}` : `${label} returned ${response.status}.`);
}

function extractResponseText(response: { output_text?: string; output?: { content?: { text?: string }[] }[] }): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim()) {
        return content.text;
      }
    }
  }

  return "{}";
}

function inferContentType(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function normalizeDefaultCurrency(value: unknown): string {
  return typeof value === "string" && SUPPORTED_DEFAULT_CURRENCIES.includes(value as typeof SUPPORTED_DEFAULT_CURRENCIES[number])
    ? value
    : "EUR";
}

function normalizeReceiptCurrency(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return CURRENCY_ALIASES[normalized] ?? (normalized || null);
}

function resolveCategory(receipt: ExtractedReceipt): string | null {
  const normalizedMerchant = normalizeSearchText(receipt.merchant);
  const matchedRule = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedMerchant.includes(normalizeSearchText(keyword)))
  );

  if (matchedRule) {
    return matchedRule.category;
  }

  if (receipt.category && receipt.category !== 'Other') {
    return receipt.category;
  }

  return receipt.category;
}

function resolveCountry(
  receipt: ExtractedReceipt,
  uploadHint: { code: string | null; name: string | null }
): { code: string | null; name: string | null } {
  const hintedCode = normalizeCountryCode(uploadHint.code);
  if (hintedCode) {
    return { code: hintedCode, name: KNOWN_COUNTRIES[hintedCode] ?? uploadHint.name ?? hintedCode };
  }

  const candidates = [
    receipt.countryCode,
    receipt.countryName,
    receipt.merchant,
    receipt.merchantAddress,
    receipt.merchantCity,
    receipt.merchantPostalCode,
    receipt.currency
  ]
    .map((value) => normalizeSearchText(value))
    .join(' ');

  const matchedRule = COUNTRY_RULES.find((rule) =>
    rule.keywords.some((keyword) => candidates.includes(normalizeSearchText(keyword)))
  );
  const code = matchedRule?.code ?? normalizeCountryCode(receipt.countryCode);

  if (!code) {
    return { code: null, name: null };
  }

  return { code, name: KNOWN_COUNTRIES[code] ?? receipt.countryName ?? code };
}

function normalizeCountryCode(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase() ?? '';
  return KNOWN_COUNTRIES[normalized] ? normalized : null;
}

function normalizeSearchText(value: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function convertCurrency(
  supabase: ReturnType<typeof createClient>,
  amount: number | null,
  sourceCurrency: string | null,
  targetCurrency: string
): Promise<CurrencyConversion> {
  const originalCurrency = normalizeReceiptCurrency(sourceCurrency);
  const conversionSource = originalCurrency ?? targetCurrency;

  if (amount === null) {
    return {
      amount: null,
      currency: targetCurrency,
      originalAmount: null,
      originalCurrency,
      exchangeRate: conversionSource === targetCurrency ? 1 : null
    };
  }

  const { data, error } = await supabase.rpc("convert_currency_amount", {
    p_amount: amount,
    p_source_currency: conversionSource,
    p_target_currency: targetCurrency
  });

  if (error) {
    throw new Error("Currency conversion rates could not be read.");
  }

  const convertedAmount = Number(data);
  if (!Number.isFinite(convertedAmount)) {
    throw new Error(`Currency conversion rate is not available for ${conversionSource} to ${targetCurrency}.`);
  }

  return {
    amount: convertedAmount,
    currency: targetCurrency,
    originalAmount: amount,
    originalCurrency,
    exchangeRate: amount > 0 ? Math.round((convertedAmount / amount) * 1_000_000) / 1_000_000 : 1
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}
