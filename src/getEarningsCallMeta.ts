import { GoogleGenAI } from "@google/genai";
import googleApiConfig from "../google-ai-config.json" with { type: "json" };

const ai = new GoogleGenAI({
  apiKey: googleApiConfig.apiKey,
});

export async function getEarningsCallMeta(
  event: SeriesEvent
): Promise<EarningsInfo> {
  const groundingTool = {
    googleSearch: {},
  };

  const configOpts = {
    tools: [groundingTool],
  };

  const prompt = `
Extract the company name from the sentence below and then search for next scheduled earnings-call date and stock ticker. 
The date must be returned in ISO 8601 format (YYYY-MM-DD). 

If the earnings-call date cannot be determined, is postponed, or is otherwise unavailable, return an 'error' field with a short explanation.


Respond with a JSON object only — no code blocks, no backticks. Respond only in JSON with this structure:

{
"companyName": "<company>",
"stockTicker": "<ticker symbol>",
"earningsCallDate": "<YYYY-MM-DD or null>",
"error": "<explanation or null>"
}

Sentence: "${event.event_title}"
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: configOpts,
  });

  if (!response.text) {
    return { error: "No response received" } as EarningsInfo;
  }

  const jsonStr = response.text
    .trim()
    .replace("```json", "")
    .replace("```", "");

  try {
    const result = { ...JSON.parse(jsonStr), eventTicker: event.event_ticker };
    return result as EarningsInfo;
  } catch (e) {
    return { error: "Invalid JSON response" } as EarningsInfo;
  }
}
