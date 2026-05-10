import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Product, Expense } from "../types";

const getAi = () => {
  const key = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
              import.meta.env.VITE_GEMINI_API_KEY || 
              '';
  if (!key) return null;
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (e) {
    return null;
  }
};

const DEFAULT_MODEL = "gemini-3-flash-preview";

export const aiService = {
  /**
   * Analyzes an image of a bill/receipt and extracts structured data.
   */
  async analyzeBill(imageBase64: string, mimeType: string): Promise<Partial<Expense>> {
    const ai = getAi();
    if (!ai) {
      console.warn("Gemini API key missing");
      return {};
    }
    
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: imageBase64, mimeType } },
              { text: "Extract receipt details: item name (summary if multiple), total amount, date, and category. Return JSON." }
            ]
          }
        ],
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
    const ai = getAi();
    if (!ai) return {};
    
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
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

      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Failed to parse voice expense", e);
      return {};
    }
  },

  /**
   * Analyzes an image of a bill from a URL and extracts products.
   */
  async analyzeBillImage(url: string): Promise<{name: string, quantity: number}[]> {
    const ai = getAi();
    if (!ai) return [];
    
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Look at this bill image: ${url}. 
          Extract all product names and their quantities. 
          Return ONLY a raw JSON array of objects. 
          Schema: [{"name": string, "quantity": number}]`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      console.error("Failed to analyze bill image", e);
      return [];
    }
  },

  /**
   * Detects products from multiple photos for bulk creation.
   */
  async detectProductsBulk(images: { data: string; mimeType: string }[]): Promise<Partial<Product>[]> {
    const ai = getAi();
    if (!ai) return [];
    
    const numImages = images.length;
    const parts = [
      ...images.map(img => ({ inlineData: { data: img.data, mimeType: img.mimeType } })),
      { text: `Act as an expert retail catalog curator. You have been provided with ${numImages} photos.
      For EACH photo, in the EXACT same order they were provided, identify the primary product.
      
      CRITICAL: You MUST return exactly ${numImages} objects in the array. 
      If you cannot identify a product in a specific photo, still provide an object for that index with name "Unknown Product" and filler details.
      
      For each item provide: 
      1. Full marketing name
2. Best fitting category (Vegetables, Fruits, Dairy, Bakery, Meat, Snacks, Beverages, Staples, Oils, Household)
      3. Engaging technical description
      4. Estimated weight/volume (e.g. 500g, 1L)
      5. Estimated market price in INR as a NUMBER.
      
      Return ONLY a raw JSON array of objects. 
      Schema: [{"name": string, "category": string, "description": string, "weight": string, "price": number}]
      
      If multiple products are in one photo, detect only the most prominent one.` }
    ];

    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: { parts },
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      console.error("Failed to parse bulk products", e);
      return [];
    }
  },

  /**
   * Complex voice command parser that understands units and quantities.
   * Handles conversions like "Add 1L" when availability is "500ml".
   */
  async parseVoiceCommand(text: string, currentCart: any[], products: Product[]): Promise<{
    intent: 'add_to_cart' | 'search' | 'remove' | 'checkout' | 'unknown',
    productName?: string,
    quantity?: number,
    unit?: string,
    productId?: string,
    multiplier?: number,
    searchQuery?: string
  }> {
    const ai = getAi();
    if (!ai) return { intent: 'unknown' };

    const productContext = products.map(p => ({ 
      id: p.id, 
      name: p.name, 
      weight: p.weight, 
      category: p.category,
      synonyms: p.synonyms || []
    })).slice(0, 100);

    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `You are an intelligent shopping assistant for Kalika Store.
          Customer says: "${text}"
          
          Available Product Samples:
          ${JSON.stringify(productContext)}
          
          Goal: 
          1. Identify intent (add_to_cart, search, remove, checkout).
          2. If intent is add_to_cart, find the matching product from the context.
          3. CRITICAL: Handle unit conversions based on the product's "weight" property. 
             - Logic: multiplier = (requested volume/weight) / (product availability weight).
          
          Return JSON:
          {
            "intent": "add_to_cart" | "search" | "remove" | "checkout" | "unknown",
            "productName": "string",
            "productId": "string",
            "quantity": number (requested count),
            "unit": "string",
            "multiplier": number (how many pieces to add to meet requested volume/weight),
            "searchQuery": "string" (if search intent)
          }`,
        config: {
          responseMimeType: "application/json"
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { intent: 'unknown' };
    }
  },

  /**
   * Semantic product search using AI.
   */
  async semanticProductSearch(query: string, products: Product[]): Promise<string[]> {
    const ai = getAi();
    if (!ai || !query.trim()) return [];

    const productList = products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      tags: p.tags || [],
      synonyms: p.synonyms || []
    }));
    
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `You are a smart shopping assistant for Kalika Store. A customer is looking for: "${query}". 
          Analyze the query for intent.
          
          Our product catalog metadata:
          ${JSON.stringify(productList)}
          
          Identify the top 10 most relevant products. 
          Return ONLY a raw JSON array of product IDs. Schema: ["id1", "id2", ...]`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      console.error("Semantic search failed", e);
      return [];
    }
  },

  /**
   * Identifies a product from an image (base64) for visual search.
   */
  async findProductByImage(imageBase64: string, mimeType: string): Promise<string> {
    const ai = getAi();
    if (!ai) return "";
    
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: imageBase64, mimeType } },
              { text: "Identify the product in this image. Give me a 2-3 word search query to find this product in a grocery catalog. Return ONLY the search query name." }
            ]
          }
        ]
      });

      return response.text?.trim() || "";
    } catch (e) {
      return "";
    }
  },

  /**
   * Finds high-quality product images using Google Search.
   */
  async findProductImages(productName: string, category?: string): Promise<string[]> {
    const ai = getAi();
    if (!ai) return [];
    
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Find 5 high-quality, professional, and REAL product photo direct URLs for: "${productName}". 
          Return ONLY a raw JSON array of image URLs ending in .jpg, .png, or .webp.`,
        config: {
          tools: [{ googleSearch: {} }] as any
        }
      });

      const text = response.text || "";
      const urls: string[] = [];
      const urlRegex = /(https?:\/\/[^\s)]+?\.(?:jpg|jpeg|png|webp|gif))/gi;
      const matches = text.match(urlRegex);
      if (matches) {
        urls.push(...matches.slice(0, 5));
      }
      return Array.from(new Set(urls));
    } catch (error: any) {
      console.warn("Primary image search failed", error?.message);
      return [];
    }
  },

  /**
   * Generates smart search metadata (keywords, synonyms, tags) for a product.
   */
  async generateSearchMetadata(name: string, description: string, category: string): Promise<{keywords: string[], synonyms: string[], tags: string[]}> {
    const ai = getAi();
    if (!ai) return { keywords: [], synonyms: [], tags: [] };
    
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `For the following product, generate SEO metadata.
          Product Name: ${name}
          Description: ${description}
          Category: ${category}
          Return ONLY a JSON object: {"keywords": ["tag1"], "synonyms": ["word1"], "tags": ["highlight1"]}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      return { keywords: [], synonyms: [], tags: [] };
    }
  },

  /**
   * Predicts the most likely unit and quantity for a product given its name and description.
   */
  async predictProductUnit(name: string, description: string): Promise<{unit: string, quantity: number}> {
    const ai = getAi();
    if (!ai) return { unit: 'Piece', quantity: 1 };

    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `Given the product name and description, predict unit and default quantity.
          Product Name: ${name}
          Description: ${description}
          Return ONLY JSON: {"unit": "Kilogram", "quantity": 1}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      return {
        unit: data.unit || 'Piece',
        quantity: typeof data.quantity === 'number' ? data.quantity : 1
      };
    } catch (e) {
      return { unit: 'Piece', quantity: 1 };
    }
  }
};
