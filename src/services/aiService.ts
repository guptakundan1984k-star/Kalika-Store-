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
   * Analyzes an image of a bill from a URL and extracts products.
   */
  async analyzeBillImage(url: string): Promise<{name: string, quantity: number}[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Look at this bill image: ${url}. 
      Extract all product names and their quantities. 
      Return ONLY a raw JSON array of objects. 
      Schema: [{"name": string, "quantity": number}]`,
      config: {
        responseMimeType: "application/json"
      }
    });

    try {
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json"
      }
    });

    try {
      const text = response.text || "[]";
      // Ensure we only get the JSON part if there's any fluff
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      console.error("Failed to parse bulk products", e);
      return [];
    }
  },

  /**
   * Semantic product search using AI.
   */
  async semanticProductSearch(query: string, products: Product[]): Promise<string[]> {
    if (!query.trim()) return [];

    const productList = products.map(p => `${p.id}: ${p.name} (${p.category})`).join('\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a smart shopping assistant for Kalika Store. A customer is looking for: "${query}". 
      Here is our product catalog:
      ${productList}
      
      Identify the top 5 most relevant products that match the customer's intent (e.g. if they ask for "breakfast items", suggest eggs, milk, bread). 
      Return ONLY a raw JSON array of product IDs. Schema: ["id1", "id2", ...]`,
      config: {
        responseMimeType: "application/json"
      }
    });

    try {
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: "Identify the product in this image. Give me a 2-3 word search query to find this product in a grocery catalog. Return ONLY the search query name." }
        ]
      }
    });

    return response.text?.trim() || "";
  },

  /**
   * Finds high-quality product images using Google Search.
   * This handles quota errors by falling back to the base model with search grounding.
   */
  async findProductImages(productName: string, category?: string): Promise<string[]> {
    const query = `${productName} ${category ? category : ''} professional product shot pack high resolution generic stock photo ecommerce`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Find 5 high-quality, professional, and REAL product photo direct URLs for: "${productName}". 
        Avoid generic cliparts or drawings. Focus on stock photos that look like they are from a grocery shelf or professional photoshoot.
        Return ONLY a raw JSON array of image URLs ending in .jpg, .png, or .webp.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const urls: string[] = [];
      const urlRegex = /(https?:\/\/[^\s)]+?\.(?:jpg|jpeg|png|webp|gif))/gi;
      const matches = response.text.match(urlRegex);
      if (matches) {
        urls.push(...matches.slice(0, 5));
      }
      if (urls.length > 0) return Array.from(new Set(urls));
    } catch (error: any) {
      console.warn("Primary image search failed, trying fallback...", error?.message);
      
      // Fallback to standard model with search grounding if 429 or other error
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `I need direct public image URLs for a product: "${productName}". Use Google Search to find 3-5 direct .jpg or .png links. If you can't find direct links, provide descriptive search keywords for a high-quality stock photo.`,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
        
        const urlRegex = /(https?:\/\/[^\s)]+?\.(?:jpg|jpeg|png|webp|gif))/gi;
        const matches = fallbackResponse.text.match(urlRegex);
        if (matches) {
          return Array.from(new Set(matches.slice(0, 5)));
        }
      } catch (fallbackError) {
        console.error("Image search fallback also failed", fallbackError);
      }
    }

    return [];
  },

  /**
   * Generates smart search metadata (keywords, synonyms, tags) for a product.
   */
  async generateSearchMetadata(name: string, description: string, category: string): Promise<{keywords: string[], synonyms: string[], tags: string[]}> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a search engine optimization expert for a grocery e-commerce app.
      For the following product, generate:
      1. Hidden keywords (internal search terms like 'nutrition', 'healthy', 'breakfast')
      2. Synonyms (words users actually type, like 'soft drink' for 'Coca-Cola')
      3. Public tags (short, visible highlights like 'Fresh', 'Sugar-free', 'Organic')

      Product Name: ${name}
      Description: ${description}
      Category: ${category}

      Return ONLY a JSON object with schema:
      {"keywords": ["tag1", "tag2"], "synonyms": ["word1", "word2"], "tags": ["highlight1", "highlight2"]}
      Keep arrays to 5-10 highly relevant items.`,
      config: {
        responseMimeType: "application/json"
      }
    });

    try {
      const text = response.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      console.error("Failed to generate metadata", e);
      return { keywords: [], synonyms: [], tags: [] };
    }
  }
};
