import { GoogleGenAI, Type } from "@google/genai";
import { Mission } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMission = async (difficulty: string): Promise<Mission> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a drone flight mission briefing for a pilot in a simulation. 
      The difficulty is ${difficulty}.
      The environment is a realistic outdoor terrain with grassy fields, trees, and concrete structures.
      Include a title, a short briefing (max 30 words), and a primary objective.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            briefing: { type: Type.STRING },
            objective: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] }
          },
          required: ['id', 'briefing', 'objective', 'difficulty']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as Mission;
    }
    throw new Error("No response text");
  } catch (error) {
    console.error("Failed to generate mission", error);
    return {
      id: "fallback-001",
      briefing: "Communication link unstable. Perform standard reconnaissance of the perimeter.",
      objective: "Fly through the central arch.",
      difficulty: "Easy"
    };
  }
};