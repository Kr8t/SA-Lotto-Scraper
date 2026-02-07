
import { GoogleGenAI, Type } from "@google/genai";
import { LottoGame, LotteryDataResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface ScrapedResult extends LotteryDataResponse {
  sources: { uri: string; title: string }[];
  errorDetail?: string;
}

/**
 * Attempts to repair a truncated JSON string by balancing brackets and braces.
 */
const fixTruncatedJson = (json: string): string => {
  const stack: string[] = [];
  let isInsideString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (char === '"' && !escaped) {
      isInsideString = !isInsideString;
    }
    escaped = char === '\\' && !escaped;

    if (!isInsideString) {
      if (char === '{' || char === '[') {
        stack.push(char === '{' ? '}' : ']');
      } else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  let repaired = json;
  // If we ended inside a string, close it
  if (isInsideString) {
    repaired += '"';
  }
  
  // Close any open objects/arrays in reverse order
  while (stack.length > 0) {
    const closer = stack.pop();
    repaired += closer;
  }

  return repaired;
};

const cleanJsonString = (str: string): string => {
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  // Remove trailing commas before closing brackets
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  
  // Try parsing. If it fails, try to fix truncation.
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    return fixTruncatedJson(cleaned);
  }
};

export const generateLotteryData = async (startDate: string, endDate: string): Promise<ScrapedResult> => {
  if (!process.env.API_KEY) {
    return { draws: [], sources: [], errorDetail: "API Key is missing." };
  }

  // Optimized prompt: shorter, focus on data density
  const prompt = `Return ONLY a JSON object for SA Lotto results (${startDate} to ${endDate}).
  Sources: nationallottery.co.za, za.national-lottery.com.
  Schema: {"draws": [{"id":string,"game":string,"date":"YYYY-MM-DD","numbers":[int],"bonusBall":int,"powerBall":int,"jackpotAmount":number}]}
  Games: Daily Lotto, Daily Lotto Plus, Lotto, Lotto Plus 1, Lotto Plus 2, PowerBall, PowerBall Plus.
  Limit: Max 40 most recent draws to ensure completion.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            draws: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  game: { type: Type.STRING, enum: Object.values(LottoGame) },
                  date: { type: Type.STRING },
                  numbers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                  bonusBall: { type: Type.INTEGER },
                  powerBall: { type: Type.INTEGER },
                  jackpotAmount: { type: Type.NUMBER }
                },
                required: ["id", "game", "date", "numbers"]
              }
            }
          }
        }
      }
    });

    const sources: { uri: string; title: string }[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
      });
    }

    const rawText = response.text || '{"draws": []}';
    const cleanedText = cleanJsonString(rawText);

    try {
      const data = JSON.parse(cleanedText) as LotteryDataResponse;
      if (data.draws && Array.isArray(data.draws)) {
        // Filter out any entries that might be incomplete due to repair
        const validDraws = data.draws.filter(d => d && d.game && d.date && Array.isArray(d.numbers));
        validDraws.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { draws: validDraws, sources };
      }
      return { draws: [], sources };
    } catch (parseError) {
      console.error("Critical JSON Parse Error:", parseError);
      return { 
        draws: [], 
        sources, 
        errorDetail: "Data stream was interrupted. Try a smaller date range." 
      };
    }
  } catch (error: any) {
    console.error("Scraping error:", error);
    return { 
      draws: [], 
      sources: [], 
      errorDetail: error.message?.includes("429") ? "Too many requests. Slow down." : "Connection failed." 
    };
  }
};
