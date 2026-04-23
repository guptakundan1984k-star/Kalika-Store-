import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Product, Expense } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const aiService = {
  /**
   * Analyzes an image of a bill/receipt and extracts structured data.
   */
  async analyzeBill(imageBase64: string, mimeType: string): Promise<Partial<Expense>> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: "Extract receipt details: item name (summary if multiple), total amount, date, and category. Return JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.NUMBER, description: "Timestamp in milliseconds" },
            category: { type: Type.STRING },
            quantity: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["itemName", "amount", "date"]
        }
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Failed to parse bill analysis", e);
      return {};
    }
  },

  /**
   * Converts voice/text input (Hindi/Hinglish/English) to structured expense data.
   */
  async analyzeVoiceExpense(text: string): Promise<Partial<Expense>> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract expense details from this text (Hindi/English/Hinglish): "${text}". Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.NUMBER },
            category: { type: Type.STRING },
            quantity: { type: Type.STRING }
          },
          required: ["itemName", "amount"]
        }
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Failed to parse voice expense", e);
      return {};
    }
  },

  /**
   * Detects products from multiple photos for bulk creation.
   */
  async detectProductsBulk(images: { data: string; mimeType: string }[]): Promise<Partial<Product>[]> {
    const parts = [
      ...images.map(img => ({ inlineData: { data: img.data, mimeType: img.mimeType } })),
      { text: "Identify the products in these images. For each unique product, provide: name, suggested category, and a clean marketing description. Return an array of JSON objects." }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["name", "category", "description"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Failed to parse bulk products", e);
      return [];
    }
  },

  /**
   * Finds high-quality product images using Google Search.
   * This uses gemini-3.1-flash-image-preview with imageSearch tool.
   */
  async findProductImages(productName: string, category?: string): Promise<string[]> {
    const query = `${productName} ${category ? category : ''} product pack high resolution catalog style white background`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: `Find high-quality product images for: "${query}". Return a list of 3-5 real product image URLs.`,
      config: {
        tools: [
          {
            googleSearch: {
              searchTypes: {
                imageSearch: {},
              }
            },
          },
        ],
      },
    });

    // Extract URLs from response
    // The model might return them in text or as inlineData if it "generates" based on search.
    // In search grounding, it usually returns source citations.
    const urls: string[] = [];
    
    // Simple heuristic to extract URLs from text
    const urlRegex = /(https?:\/\/[^\s)]+?\.(?:jpg|jpeg|png|webp|gif))/gi;
    const matches = response.text.match(urlRegex);
    if (matches) {
      urls.push(...matches.slice(0, 5));
    }

    return Array.from(new Set(urls));
  }
};
