
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

const adminApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});
const db = adminApp.firestore(firebaseConfig.firestoreDatabaseId);
const collectionPath = 'products';

async function wipeCatalog() {
  console.log("Starting catalog wipe...");
  const snapshot = await db.collection(collectionPath).get();
  if (snapshot.empty) {
    console.log("Catalog is already empty.");
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Successfully deleted ${snapshot.size} products.`);
}

wipeCatalog().catch(console.error);
