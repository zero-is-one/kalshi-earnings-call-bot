import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyDur_L7-GU3E409JGSh_3NvsFOJcYglRxM",
});

export async function getPromptResponse(
  prompt: string,
  debugFile: string
): Promise<
  | {
      word: string;
      eventTicker: string;
      marketTicker: string;
      side: string;
      contractCount: number;
    }[]
  | { error: string }
> {
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

  fs.writeFileSync(debugFile, response.text || "No response");

  try {
    const jsonStr = response.text.split("```json")[1]?.split("```")[0];
    if (!jsonStr) {
      return { error: "No JSON response found" };
    }
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    return { error: "Invalid JSON response" };
  }
}
