import { GoogleGenAI } from "@google/genai";

const getAi = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('Missing GEMINI_API_KEY in environment');
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (e) {
    console.error('Failed to initialize GoogleGenAI:', e);
    return null;
  }
};

async function callAI(contents: any, modelName: string = "gemini-3-flash-preview") {
  const ai = getAi();
  if (!ai) {
    return { text: "AI service is currently unavailable. Please check your API configuration." };
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
    });
    
    return response;
  } catch (error: any) {
    console.error('Gemini API request failed:', error);
    return { text: "I'm having trouble connecting to my AI service. Please try again later." };
  }
}

export async function generateProductDescription(name: string, category: string) {
  const result = await callAI(
    `Generate a high-quality, professional product description for a grocery item named "${name}" in the category "${category}". Include nutritional highlights and usage suggestions.`
  );
  return result.text;
}

export async function findProductByBarcode(barcode: string) {
  const result: any = await callAI(
    `Identify the grocery product with barcode "${barcode}". Provide its official name, category, standard weight (if applicable), and a professional description. Also suggest a high-quality product image URL or search keywords for one. Return ONLY raw JSON: {"name": "...", "category": "...", "weight": "...", "description": "...", "searchKeywords": "..."}`
  );
  try {
    const text = result.text || "";
    const jsonStr = text.match(/{.*}/s)?.[0] || '{}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { name: "" };
  }
}

export async function suggestRestocking(inventory: any[]) {
  const result: any = await callAI(
    `Based on this inventory: ${JSON.stringify(inventory)}, suggest which items need restocking and why. Consider seasonal trends and common grocery demand.`
  );
  return result.text;
}

export async function analyzeProductImage(base64Image: string) {
  const result: any = await callAI({
    parts: [
      { text: "Identify this grocery product and suggest a name, category, and estimated price in INR. Return ONLY raw JSON: {\"name\": \"...\", \"category\": \"...\", \"price\": 0, \"description\": \"...\"}" },
      { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/jpeg" } }
    ]
  });
  try {
    const text = result.text || "";
    const jsonStr = text.match(/{.*}/s)?.[0] || '{}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { name: "" };
  }
}

export async function parsePaperBill(base64Image: string) {
  const result: any = await callAI({
    parts: [
      { text: "Extract items and their quantities from this paper bill. Return a list of items with their names and quantities. Return ONLY raw JSON: {\"items\": [{\"name\": \"...\", \"quantity\": 1}]}" },
      { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/jpeg" } }
    ]
  });
  try {
    const text = result.text || "";
    const jsonStr = text.match(/{.*}/s)?.[0] || '{"items": []}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { items: [] };
  }
}

export async function recognizeHandwriting(base64Image: string) {
  const result: any = await callAI({
    parts: [
      { text: "You are an expert at reading messy handwriting, specifically doctor prescriptions in Hindi and English. Extract the list of medicines/grocery items and their quantities from this image. Return ONLY raw JSON: {\"items\": [{\"name\": \"...\", \"quantity\": 1, \"unit\": \"...\"}]}" },
      { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/jpeg" } }
    ]
  });
  try {
    const text = result.text || "";
    const jsonStr = text.match(/{.*}/s)?.[0] || '{"items": []}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { items: [] };
  }
}

export async function searchProductDetails(name: string) {
  const result: any = await callAI(
    `Search for detailed information about the grocery product "${name}". Find its professional description, typical price in India, and a high-quality public image URL if available. Return ONLY raw JSON: {"description": "...", "price": 0, "imageUrl": "...", "category": "..."}`
  );
  try {
    const text = result.text || "";
    const jsonStr = text.match(/{.*}/s)?.[0] || '{}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { name: "" };
  }
}

export async function answerAdminQuery(query: string, data: any, base64Image?: string) {
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

  const promptParts: any[] = [
    { text: `You are an expert AI Retail Assistant for Kalika Store.
    You help Store Admins and CS (Customer Service) agents manage inventory, orders, and user issues.
    
    Current Store Context: ${JSON.stringify(optimizedData).slice(0, 15000)}...
    
    Instructions:
    1. You are the digital backbone of Kalika Store operations. Be extremely efficient, helpful, and professional.
    2. Help CS agents track their "Handheld Cash" (staff wallet balance) and explain why it changed.
    3. Analyze the provided order list to identify problematic orders, needs for delivery closure, and debt summaries for customers.
    4. Provide clear, actionable steps for inventory management.
    5. If a CS agent or customer asks about "syncing", explain that values update immediately upon operation completion.
    6. For customer-facing support, emphasize the store's heritage (since 2010) and commitment to quality.
    7. Directly answer questions about store hours: Mon-Sat 10:40 AM - 8:00 PM (delivery closes at 7:45 PM), Sun 10:40 AM - 3:00 PM.
    8. Use chat/text specifically to guide the user. Avoid long monologues.
    9. If an order is "Out for Delivery", you can suggest the CS agent to coordinate with the delivery partner via the Phone icon if available.
    
    User Query: ${query}` }
  ];
  if (base64Image) {
    promptParts.push({
      inlineData: {
        data: base64Image.split(',')[1] || base64Image,
        mimeType: "image/jpeg"
      }
    });
  }

  const result = await callAI({ parts: promptParts });
  return result.text || "Sorry, I couldn't generate a response.";
}

export async function generateSupportReply(history: any[]) {
  const result: any = await callAI(
    `Based on this chat history: ${JSON.stringify(history)}, generate a helpful reply. Return only the reply text.`
  );
  return result.text;
}

export async function checkEnvironmentStatus() {
  try {
    const ai = getAi();
    if (!ai) return { status: 'open', reason: '' };

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Check the following for Ranchi, Jharkhand, India:
              1. Tomorrow's public holidays or major occasions.
              2. Current and forecasted weather conditions (specifically rain, flood, or extreme weather).
              
              Based on this, determine if a grocery delivery service should be:
              - "closed" (if there's a major occasion tomorrow)
              - "delayed" (if there's extreme weather)
              - "open" (standard operations)
              
              Provide a short reason in English.
              Return ONLY raw JSON: {"status": "open" | "delayed" | "closed", "reason": "...", "weather": "...", "holiday": "..."}`
            }
          ]
        }
      ],
      config: {
        tools: [{ googleSearch: {} }] as any
      }
    });

    const text = result.text;
    const jsonStr = text.match(/{.*}/s)?.[0] || '{"status": "open", "reason": ""}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { status: 'open', reason: '' };
  }
}
