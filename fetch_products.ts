import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(admin.apps[0], firebaseConfig.firestoreDatabaseId);

async function listProducts() {
  const snapshot = await db.collection('products').get();
  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  console.log(JSON.stringify(products, null, 2));
}

listProducts().catch(console.error);
