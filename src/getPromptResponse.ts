import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import googleApiConfig from "../google-ai-config.json" with { type: "json" };

const ai = new GoogleGenAI({
  apiKey: googleApiConfig.apiKey,
});

export type PromptResponse = {
  orders: {
    market_id: string;
    word: string;
    contract_count: number;
    estimated_cost: number;
    reasoning: string;
  }[];
  total_spend: number;
  remaining_budget: number;
};

export async function getPromptResponse(
  prompt: string,
): Promise<PromptResponse | { error: string }> {
  const configOpts = {
    tools: [],
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: configOpts,
  });

  if (!response.text) {
    return { error: "No response received" };
  }

  console.log("response.text:", response.text);

  try {
    const jsonStr = response.text.replace("```json", "").replace("```", "");
    if (!jsonStr) {
      return { error: "No JSON response found" };
    }
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.log("Error parsing JSON response:", e);
    return { error: "Invalid JSON response" };
  }
}
