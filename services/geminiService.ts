
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse } from "../types";

export const analyzePosition = async (fen: string, history: string[]): Promise<AnalysisResponse | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Current FEN: ${fen}\nHistory: ${history.join(', ')}\nAnalyze this position and suggest the best move. Respond in Arabic.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluation: { type: Type.STRING, description: "A brief evaluation of the position." },
            suggestion: { type: Type.STRING, description: "The suggested best move (SAN format)." },
            reasoning: { type: Type.STRING, description: "Brief explanation of why this move is good." }
          },
          required: ["evaluation", "suggestion", "reasoning"]
        },
        systemInstruction: "You are a World Chess Grandmaster assistant. Provide insightful and professional analysis in Arabic."
      }
    });

    return JSON.parse(response.text.trim()) as AnalysisResponse;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};
