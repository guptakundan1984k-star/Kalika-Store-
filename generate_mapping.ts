import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

async function generateMapping() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    return;
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const products = [
    "Aashirvaad Atta 10kg", "Active Wheel Surf 1 Kg", "Active Wheel Surf 2in1 500 Gm", "Amul kool", "Amul lassi",
    "Amul Masti Chaach", "Amul milk 500ml", "Amul paneer", "Amulya", "Arhar dal", "Bisleri 1L", "Cadbury Celebration Box",
    "Cinthol Soap", "Clinic Plus Shampoo", "Dettol soap set", "Fortune Soyabean Oil 1 Lt", "Ghadi Detergent 1kg",
    "Good day biscuit", "Horlicks 1/2kg", "India gate basmati rice 1kg", "Kurkure Masala Munch", "Lays Classic Salted",
    "Maggi 2-Minute Noodles", "Parle-G Biscuit", "Sting Energy Drink", "Sudha Milk 500ml", "Tata Namak 1kg", "Thums Up 1L",
    "Vim Dishwash Bar", "Vim Liquid Dishwash 500ml", "Vim Anti-Bacterial", "Swiss Roll", "Taaza Tea 50", "Tata gold chaipatti"
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Find high-quality, professional product image URLs for the following products. 
            Format the output as a JSON object where the keys are product names and values are image URLs.
            
            Products: ${products.join(", ")}`
        }]
      }],
      config: {
        responseMimeType: "application/json"
      }
    });

    fs.writeFileSync('product_mapping.json', response.text || "{}");
    console.log("Mapping generated successfully.");
  } catch (error) {
    console.error("Failed to generate mapping:", error);
  }
}

generateMapping().catch(console.error);
