import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateProductDescription(name: string, category: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a high-quality, professional product description for a grocery item named "${name}" in the category "${category}". Include nutritional highlights and usage suggestions.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text;
}

export async function suggestRestocking(inventory: any[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on this inventory: ${JSON.stringify(inventory)}, suggest which items need restocking and why. Consider seasonal trends and common grocery demand.`,
  });
  return response.text;
}

export async function analyzeProductImage(base64Image: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: "Identify this grocery product and suggest a name, category, and estimated price in INR. Use Google Search to find accurate current market prices in India if possible." },
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
      ]
    },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          price: { type: Type.NUMBER },
          description: { type: Type.STRING }
        },
        required: ["name", "category", "price", "description"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function parsePaperBill(base64Image: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: "Extract items and their quantities from this paper bill. Return a list of items with their names and quantities." },
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER }
              },
              required: ["name", "quantity"]
            }
          }
        },
        required: ["items"]
      }
    }
  });
  return JSON.parse(response.text || "{\"items\": []}");
}

export async function recognizeHandwriting(base64Image: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: "You are an expert at reading messy handwriting, specifically doctor prescriptions in Hindi and English. Extract the list of medicines/grocery items and their quantities from this image. Return the result in a structured JSON format." },
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Name of the item/medicine" },
                quantity: { type: Type.NUMBER, description: "Quantity or dosage" },
                unit: { type: Type.STRING, description: "Unit like 'strip', 'bottle', 'kg', etc." }
              },
              required: ["name", "quantity"]
            }
          }
        },
        required: ["items"]
      }
    }
  });
  return JSON.parse(response.text || "{\"items\": []}");
}

export async function searchProductDetails(name: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Search for detailed information about the grocery product "${name}". Find its professional description, typical price in India, and a high-quality public image URL if available. If you can't find a real image URL, suggest a descriptive keyword for a placeholder image.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          price: { type: Type.NUMBER },
          imageUrl: { type: Type.STRING, description: "A real public image URL or a descriptive keyword for placeholder" },
          category: { type: Type.STRING }
        },
        required: ["description", "price", "imageUrl", "category"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function answerAdminQuery(query: string, data: any, base64Image?: string) {
  const textPart = {
    text: `You are an expert AI assistant for Kalika Store, a premium grocery store in Ranchi. 
    Use this store data: ${JSON.stringify(data)} 
    And your general knowledge (use Google Search for current trends/prices) to answer the customer query: "${query}".
    Be extremely helpful, polite, and professional. Never say "no" or "I can't help" - always find a way to assist the customer or provide relevant information. 
    You are also a technical expert on this website. If the customer asks for code changes, design improvements, or technical help, provide high-quality TypeScript/React/Tailwind code snippets and detailed explanations on how to implement them. 
    If the customer asks about something not in the data, provide general helpful advice or suggest they contact the store directly.`
  };

  const parts: any[] = [textPart];
  if (base64Image) {
    parts.push({
      inlineData: {
        data: base64Image.split(',')[1] || base64Image,
        mimeType: "image/jpeg"
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text;
}

export async function generateSupportReply(history: any[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a professional customer support agent for Kalika Store. 
    Based on this chat history: ${JSON.stringify(history)}, generate a helpful, empathetic, and professional reply to the customer. 
    If they are reporting a problem, apologize and offer a solution. 
    If they are asking a question, provide a clear answer. 
    Keep the tone friendly and helpful.`,
  });
  return response.text;
}
