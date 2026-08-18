import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

type ExtractedReceipt = {
  merchant: string | null;
  date: string | null;
  currency: string | null;
  totalAmount: number | null;
  category: string | null;
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

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select("id, image_url")
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

    const imageType = image.type || "image/png";
    if (!imageType.startsWith("image/")) {
      throw new Error("OCR currently supports PNG and JPG receipt images.");
    }

    const imageBase64 = arrayBufferToBase64(await image.arrayBuffer());
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Extract receipt data. Return only JSON with merchant, date (YYYY-MM-DD or null), currency (ISO code or null), totalAmount (number or null), and category (one of: ${KNOWN_CATEGORIES.join(", ")}, or null if unclear). Never guess missing values.`
          },
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

    if (!openAiResponse.ok) {
      const errorBody = await openAiResponse.json().catch(() => null);
      const providerMessage = errorBody?.error?.message as string | undefined;
      if (openAiResponse.status === 429) {
        throw new Error(
          providerMessage?.toLowerCase().includes("quota")
            ? "OCR provider quota exceeded. Check the OpenAI account billing/plan."
            : "OCR provider is rate limited. Please try again in a moment."
        );
      }
      throw new Error(providerMessage ? `OCR provider error: ${providerMessage}` : `OCR provider returned ${openAiResponse.status}.`);
    }

    const completion = await openAiResponse.json();
    const content = completion.choices?.[0]?.message?.content;
    const extracted = normalizeExtraction(JSON.parse(content ?? "{}"));

    let categoryId: string | null = null;
    if (extracted.category) {
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("name", extracted.category)
        .maybeSingle();
      categoryId = category?.id ?? null;
    }

    const { error: updateError } = await supabase
      .from("receipts")
      .update({
        merchant_name: extracted.merchant,
        receipt_date: extracted.date,
        total_amount: extracted.totalAmount,
        currency: extracted.currency ?? "EUR",
        category_id: categoryId,
        processing_status: "processed"
      })
      .eq("id", receiptId)
      .eq("user_id", userData.user.id);

    if (updateError) {
      throw new Error("OCR completed, but the receipt could not be updated.");
    }

    return json({ success: true, receipt: extracted });
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
    date: typeof value.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date) ? value.date : null,
    currency: typeof value.currency === "string" ? value.currency.trim().toUpperCase() || null : null,
    totalAmount: Number.isFinite(amount) && amount >= 0 ? amount : null,
    category: typeof value.category === "string" && KNOWN_CATEGORIES.includes(value.category) ? value.category : null
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
