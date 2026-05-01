import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
    { text: `You are helpful AI support for Kalika Store. You are responding to CSRs and Admins. 
    Context: ${JSON.stringify(optimizedData).slice(0, 15000)}...
    
    Query: ${query}` }
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
