import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";

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
}

export async function generateChatCompletion(options: LLMCompletionOptions): Promise<{
  content: string;
  provider: "anthropic" | "openai";
  model: string;
}> {
  const { systemPrompt, messages, temperature = 0.2, maxTokens = 1000, abortSignal } = options;

  // 1. Try Anthropic Claude first if configured
  if (anthropicClient && anthropicKey) {
    try {
      // Anthropic messages format: array of user & assistant messages, system prompt passed separately
      const claudeMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Ensure at least one message exists
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
    const text = completion.choices[0]?.message?.content || "";
    return {
      content: text.trim(),
      provider: "openai",
      model: openaiModel,
    };
  }

  throw new Error("No LLM API keys configured. Please configure ANTHROPIC_API_KEY or OPENAI_API_KEY in .env");
}
