import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

export const GOOGLE_PROVIDER = "google";
export const OPENAI_PROVIDER = "openai";
export const ANTHROPIC_PROVIDER = "anthropic";

export type ModelProvider =
  | typeof GOOGLE_PROVIDER
  | typeof OPENAI_PROVIDER
  | typeof ANTHROPIC_PROVIDER;

export function getModel(
  provider: ModelProvider,
  apiKey: string,
  maxConcurrency?: number,
): BaseChatModel {
  // // Later we will support multiple model and will get them from the config
  if (provider === OPENAI_PROVIDER) {
    return new ChatOpenAI({
      apiKey,
      model: "o3-mini",
      maxConcurrency: maxConcurrency ? maxConcurrency : Infinity,
    }) as unknown as BaseChatModel;
  }

  if (provider === GOOGLE_PROVIDER) {
    return new ChatGoogleGenerativeAI({
      apiKey,
      model: "gemini-2.5-flash-lite-preview-06-17",
      maxConcurrency: maxConcurrency ? maxConcurrency : Infinity,
    }) as BaseChatModel;
  }

  if (provider === ANTHROPIC_PROVIDER) {
    return new ChatAnthropic({
      apiKey,
      model: "claude-3-5-sonnet-latest",
      maxConcurrency: maxConcurrency ? maxConcurrency : Infinity,
    }) as unknown as BaseChatModel;
  }

  throw new Error(`Unsupported model provider: ${provider}`);
}
