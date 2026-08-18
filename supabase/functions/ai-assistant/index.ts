import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const SYSTEM_PROMPT_TEMPLATE = (todayIso: string) => `You are a household finance assistant. Today's date is ${todayIso}. Use this date to resolve relative periods like "this month", "last month", "this year", or "last year" into exact start_date/end_date values (YYYY-MM-DD) when calling tools.
Answer using only the data returned by your tools.
Never fabricate numbers, never guess, and never expose database or SQL details.
Be concise and analytical. Use percentages and trends where relevant. Offer one practical recommendation when appropriate.
Do not use emojis. If the tools return no matching data, say so plainly.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_category_breakdown",
      description: "Get total spending grouped by category and a month-by-month spending trend for the recent months.",
      parameters: {
        type: "object",
        properties: {
          months_back: { type: "number", description: "How many months back to include, default 7" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_filtered_spending",
      description: "Get total amount spent and receipt count filtered by merchant name, category name, and/or a date range.",
      parameters: {
        type: "object",
        properties: {
          merchant: { type: "string", description: "Partial or full merchant name, e.g. 'H&M' or 'Aldi'" },
          category: {
            type: "string",
            description: "Category name, e.g. Groceries, Restaurant, Transport, Utilities, Healthcare, Clothing, Entertainment, Travel, Education, Subscriptions, Other"
          },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_receipts",
      description: "Get the most recent receipts with merchant, date, amount, currency, and category.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max receipts to return, default 10, max 25" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_summary",
      description: "Get the current month spend, annual spend, and average daily spend.",
      parameters: { type: "object", properties: {} }
    }
  }
];

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return json({ error: "Authentication is required." }, 401);
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    return json({ error: "AI assistant is not configured. Add OPENAI_API_KEY to Supabase Edge Function secrets." }, 503);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "Authentication is required." }, 401);
  }

  const { message, conversationId } = await request.json();
  if (typeof message !== "string" || !message.trim()) {
    return json({ error: "A message is required." }, 400);
  }

  let activeConversationId = typeof conversationId === "string" ? conversationId : null;
  if (!activeConversationId) {
    const { data: conversation, error: conversationError } = await supabase
      .from("ai_conversations")
      .insert({ user_id: userData.user.id })
      .select("id")
      .single();
    if (conversationError || !conversation) {
      return json({ error: "Could not start a conversation." }, 500);
    }
    activeConversationId = conversation.id;
  }

  await supabase.from("ai_messages").insert({
    conversation_id: activeConversationId,
    role: "user",
    content: message
  });

  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", activeConversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const conversationMessages = (history ?? []).map((row) => ({ role: row.role, content: row.content }));

  try {
    const reply = await runAssistant(openAiKey, supabase, conversationMessages);

    await supabase.from("ai_messages").insert({
      conversation_id: activeConversationId,
      role: "assistant",
      content: reply
    });

    return json({ conversationId: activeConversationId, reply });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "The assistant could not respond." }, 502);
  }
});

async function runAssistant(
  openAiKey: string,
  supabase: ReturnType<typeof createClient>,
  conversationMessages: { role: string; content: string }[]
): Promise<string> {
  const messages: Record<string, unknown>[] = [
    { role: "system", content: SYSTEM_PROMPT_TEMPLATE(new Date().toISOString().slice(0, 10)) },
    ...conversationMessages
  ];

  for (let round = 0; round < 3; round++) {
    const response = await callOpenAi(openAiKey, messages, true);
    const choice = response.choices?.[0]?.message;
    const toolCalls = choice?.tool_calls as { id: string; function: { name: string; arguments: string } }[] | undefined;

    if (!toolCalls?.length) {
      return choice?.content?.trim() || "I could not find an answer for that.";
    }

    messages.push({ role: "assistant", content: choice.content ?? null, tool_calls: toolCalls });

    for (const toolCall of toolCalls) {
      const args = safeParseJson(toolCall.function.arguments);
      const result = await executeTool(supabase, toolCall.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      });
    }
  }

  const finalResponse = await callOpenAi(openAiKey, messages, false);
  return finalResponse.choices?.[0]?.message?.content?.trim() || "I could not find an answer for that.";
}

async function callOpenAi(openAiKey: string, messages: unknown[], allowTools: boolean) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      ...(allowTools ? { tools: TOOLS, tool_choice: "auto" } : {})
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const providerMessage = errorBody?.error?.message as string | undefined;
    throw new Error(providerMessage ?? `AI provider returned ${response.status}.`);
  }

  return response.json();
}

async function executeTool(
  supabase: ReturnType<typeof createClient>,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "get_category_breakdown": {
      const { data, error } = await supabase.rpc("get_spending_analytics", {
        months_back: clampNumber(args.months_back, 7, 1, 24)
      });
      return error ? { error: error.message } : data;
    }
    case "get_filtered_spending": {
      let categoryId: string | null = null;
      if (typeof args.category === "string" && args.category.trim()) {
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", args.category.trim())
          .maybeSingle();
        categoryId = category?.id ?? null;
      }

      const { data, error } = await supabase.rpc("get_filtered_analytics", {
        p_merchant: typeof args.merchant === "string" && args.merchant.trim() ? args.merchant.trim() : null,
        p_category_id: categoryId,
        p_start_date: typeof args.start_date === "string" ? args.start_date : null,
        p_end_date: typeof args.end_date === "string" ? args.end_date : null
      });
      return error ? { error: error.message } : data;
    }
    case "get_recent_receipts": {
      const { data, error } = await supabase.rpc("get_receipt_history", {
        p_page: 1,
        p_page_size: clampNumber(args.limit, 10, 1, 25)
      });
      return error ? { error: error.message } : data;
    }
    case "get_dashboard_summary": {
      const { data, error } = await supabase.rpc("get_dashboard_summary");
      return error ? { error: error.message } : data;
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function safeParseJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
