import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getDbConnection } from "@/lib/db";

const anthropicKey = process.env.ANTHROPIC_API_KEY;
const anthropicModel = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const openaiKey = process.env.OPENAI_API_KEY;
const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

const anthropicClient = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
const openaiClient = openaiKey && openaiKey !== "missing-key" ? new OpenAI({ apiKey: openaiKey }) : null;

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionOptions {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
  userId?: string;
}

// Cost per token in USD
const TOKEN_COST: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 0.80 / 1_000_000, output: 4.00 / 1_000_000 },
  "claude-haiku-4-5":          { input: 0.80 / 1_000_000, output: 4.00 / 1_000_000 },
  "gpt-4o-mini":               { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  "gpt-4o":                    { input: 2.50 / 1_000_000, output: 10.0 / 1_000_000 },
};

function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = TOKEN_COST[model] ?? { input: 1.00 / 1_000_000, output: 4.00 / 1_000_000 };
  return inputTokens * rates.input + outputTokens * rates.output;
}

async function logUsage(
  userId: string | null | undefined,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  try {
    const cost = calcCost(model, inputTokens, outputTokens);
    const conn = await getDbConnection();
    await conn.execute(
      `INSERT INTO ai_usage (id, user_id, provider, model, input_tokens, output_tokens, cost_usd)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
      [userId ?? null, provider, model, inputTokens, outputTokens, cost],
    );
    await conn.end();
  } catch {
    // Non-fatal — never let logging break the chat response
  }
}

export async function generateChatCompletion(options: LLMCompletionOptions): Promise<{
  content: string;
  provider: "anthropic" | "openai";
  model: string;
}> {
  const { systemPrompt, messages, temperature = 0.2, maxTokens = 350, abortSignal, userId } = options;

  // 1. Try Anthropic Claude first if configured
  if (anthropicClient && anthropicKey) {
    try {
      const claudeMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      if (claudeMessages.length === 0) {
        claudeMessages.push({ role: "user", content: "Hello" });
      }

      const response = await anthropicClient.messages.create(
        {
          model: anthropicModel,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: claudeMessages,
        },
        { signal: abortSignal }
      );

      void logUsage(
        userId,
        "anthropic",
        anthropicModel,
        response.usage.input_tokens,
        response.usage.output_tokens,
      );

      const firstBlock = response.content[0];
      const text = firstBlock && firstBlock.type === "text" ? firstBlock.text : "";
      return {
        content: text.trim(),
        provider: "anthropic",
        model: anthropicModel,
      };
    } catch (err: unknown) {
      console.warn("[LLM Client] Anthropic call failed, checking fallback:", (err as Error)?.message);
      if (!openaiClient) throw err;
    }
  }

  // 2. Fallback to OpenAI if configured
  if (openaiClient) {
    const completion = await openaiClient.chat.completions.create(
      {
        model: openaiModel,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature,
        max_tokens: maxTokens,
      },
      { signal: abortSignal }
    );

    if (completion.usage) {
      void logUsage(
        userId,
        "openai",
        openaiModel,
        completion.usage.prompt_tokens,
        completion.usage.completion_tokens,
      );
    }

    const text = completion.choices[0]?.message?.content || "";
    return {
      content: text.trim(),
      provider: "openai",
      model: openaiModel,
    };
  }

  throw new Error("No LLM API keys configured. Please configure ANTHROPIC_API_KEY or OPENAI_API_KEY in .env");
}
