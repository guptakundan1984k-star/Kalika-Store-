import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  // Try platform injection first, then Vite env, then empty
  try {
    return (import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || '');
  } catch (e) {
    return '';
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

async function callAI(contents: any, model: string = "gemini-3-flash-preview") {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: Array.isArray(contents.parts) ? contents : contents
    });
    return response;
  } catch (error: any) {
    console.error('Gemini API request failed:', error);
    throw new Error('AI analysis failed. Please ensure your API key is correctly configured.');
  }
}

export async function generateProductDescription(name: string, category: string) {
  const result = await callAI(
    `Generate a high-quality, professional product description for a grocery item named "${name}" in the category "${category}". Include nutritional highlights and usage suggestions.`
  );
  return result.text;
}

export async function findProductByBarcode(barcode: string) {
  const result = await callAI(
    `Identify the grocery product with barcode "${barcode}". Provide its official name, category, standard weight (if applicable), and a professional description. Also suggest a high-quality product image URL or search keywords for one. Return ONLY raw JSON: {"name": "...", "category": "...", "weight": "...", "description": "...", "searchKeywords": "..."}`
  );
  try {
    const jsonStr = result.text?.match(/{.*}/s)?.[0] || '{}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return {};
  }
}

export async function suggestRestocking(inventory: any[]) {
  const result = await callAI(
    `Based on this inventory: ${JSON.stringify(inventory)}, suggest which items need restocking and why. Consider seasonal trends and common grocery demand.`
  );
  return result.text;
}

export async function analyzeProductImage(base64Image: string) {
  const result = await callAI({
    parts: [
      { text: "Identify this grocery product and suggest a name, category, and estimated price in INR. Return ONLY raw JSON: {\"name\": \"...\", \"category\": \"...\", \"price\": 0, \"description\": \"...\"}" },
      { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/jpeg" } }
    ]
  });
  try {
    const jsonStr = result.text?.match(/{.*}/s)?.[0] || '{}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return {};
  }
}

export async function parsePaperBill(base64Image: string) {
  const result = await callAI({
    parts: [
      { text: "Extract items and their quantities from this paper bill. Return a list of items with their names and quantities. Return ONLY raw JSON: {\"items\": [{\"name\": \"...\", \"quantity\": 1}]}" },
      { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/jpeg" } }
    ]
  });
  try {
    const jsonStr = result.text?.match(/{.*}/s)?.[0] || '{"items": []}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { items: [] };
  }
}

export async function recognizeHandwriting(base64Image: string) {
  const result = await callAI({
    parts: [
      { text: "You are an expert at reading messy handwriting, specifically doctor prescriptions in Hindi and English. Extract the list of medicines/grocery items and their quantities from this image. Return ONLY raw JSON: {\"items\": [{\"name\": \"...\", \"quantity\": 1, \"unit\": \"...\"}]}" },
      { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/jpeg" } }
    ]
  });
  try {
    const jsonStr = result.text?.match(/{.*}/s)?.[0] || '{"items": []}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { items: [] };
  }
}

export async function searchProductDetails(name: string) {
  const result = await callAI(
    `Search for detailed information about the grocery product "${name}". Find its professional description, typical price in India, and a high-quality public image URL if available. Return ONLY raw JSON: {"description": "...", "price": 0, "imageUrl": "...", "category": "..."}`
  );
  try {
    const jsonStr = result.text?.match(/{.*}/s)?.[0] || '{}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return {};
  }
}

export async function answerAdminQuery(query: string, data: any, base64Image?: string) {
  // Optimization: Truncate large context to prevent token limit errors
  const sanitizeData = (obj: any) => {
    if (Array.isArray(obj)) {
      return obj.slice(0, 50).map(item => {
        const { description, images, ...rest } = item;
        return { ...rest, hasDescription: !!description };
      });
    }
    return obj;
  };

  const optimizedData: any = {};
  for (const key in data) {
    optimizedData[key] = sanitizeData(data[key]);
  }

  const parts: any[] = [
    { text: `You are an expert AI Retail Assistant for Kalika Store.
    You help Store Admins and CS (Customer Service) agents manage inventory, orders, and user issues.
    
    Current Store Context: ${JSON.stringify(optimizedData).slice(0, 15000)}...
    
    Instructions:
    1. Be concise, professional, and helpful.
    2. If asked about orders, use the provided order list to give specific details.
    3. If asked about stock, refer to active products.
    4. For CS agents, emphasize helpfulness for delivery and wallet balance queries.
    5. If a query is ambiguous, ask for clarification.
    
    User Query: ${query}` }
  ];
  if (base64Image) {
    parts.push({
      inlineData: {
        data: base64Image.split(',')[1] || base64Image,
        mimeType: "image/jpeg"
      }
    });
  }

  const result = await callAI({ parts });
  return result.text || "Sorry, I couldn't generate a response.";
}

export async function generateSupportReply(history: any[]) {
  const result = await callAI(
    `Based on this chat history: ${JSON.stringify(history)}, generate a helpful reply. Return only the reply text.`
  );
  return result.text;
}

export async function checkEnvironmentStatus() {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `Check the following for Ranchi, Jharkhand, India:
          1. Tomorrow's public holidays or major occasions.
          2. Current and forecasted weather conditions (specifically rain, flood, or extreme heat).
          
          Based on this, determine if a grocery delivery service should be:
          - "closed" (if there's a major occasion tomorrow)
          - "delayed" (if there's a natural disaster or extreme weather like rain/flood/extreme heat)
          - "open" (standard operations)
          
          Provide a short reason in English.
          Return ONLY raw JSON: {"status": "open" | "delayed" | "closed", "reason": "...", "weather": "...", "holiday": "..."}`
        }
      ],
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const jsonStr = result.text?.match(/{.*}/s)?.[0] || '{"status": "open", "reason": ""}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { status: 'open', reason: '' };
  }
}
