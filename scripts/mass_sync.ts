
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

// We use the apiKey and projectId to initialize firestore
// In a script environment, if we don't have a service account, we can use the client SDK or environment auth
// But since firebase-admin is installed, it's better to use it if we have credentials.
// AI Studio environment usually has GOOGLE_APPLICATION_CREDENTIALS set or similar.
// However, I'll use the 'firebase' client SDK if admin needs a service account key which I don't have.

import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const app = initializeClientApp(firebaseConfig);
const db = getClientFirestore(app, firebaseConfig.firestoreDatabaseId);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

async function findProductImages(productName: string, category?: string): Promise<string[]> {
  const query = `${productName} ${category ? category : ''} product pack high resolution catalog style white background`;
  
  try {
    const response = await (ai as any).models.generateContent({
      model: 'gemini-2.0-flash', 
      contents: { role: 'user', parts: [{ text: `Find high-quality product images for: "${query}". Return only a bulleted list of 5 real product image URLs (direct links to .jpg or .png).` }] },
      config: {
        tools: [
          {
            //@ts-ignore
            googleSearch: {}
          },
        ],
      }
    });

    const text = response.text || "";
    const urlRegex = /(https?:\/\/[^\s)]+?\.(?:jpg|jpeg|png|webp|gif))/gi;
    const matches = text.match(urlRegex);
    return Array.from(new Set(matches || []));
  } catch (e) {
    console.error(`Failed to find images for ${productName}`, e);
    return [];
  }
}

async function syncAll() {
  console.log("Starting massive product image sync...");
  const snapshot = await getDocs(collection(db, 'products'));
  const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
  
  console.log(`Found ${products.length} products total.`);
  
  for (const p of products) {
    // Only skip if it's already a "real" looking URL and not a generic one
    if (p.image && !p.image.includes('picsum.photos') && !p.image.includes('placeholder') && !p.image.includes('unsplash')) {
       // console.log(`Skipping ${p.name} - looks like it has a real URL.`);
       // continue;
    }

    console.log(`Syncing ${p.name}...`);
    const urls = await findProductImages(p.name, p.category);
    
    if (urls.length > 0) {
      await updateDoc(doc(db, 'products', p.id), {
        image: urls[0],
        primaryImage: urls[0],
        images: urls
      });
      console.log(`✅ Updated ${p.name} with ${urls.length} images.`);
    } else {
      console.log(`❌ No images found for ${p.name}`);
    }
    
    // Sleep to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log("Mass sync complete!");
  process.exit(0);
}

syncAll().catch(e => {
  console.error(e);
  process.exit(1);
});
