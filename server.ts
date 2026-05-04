import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { google } from "googleapis";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

// Load firebase config
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
}

const getAdminApp = () => {
  if (admin.apps.length > 0) return admin.apps[0];
  try {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId,
    });
  } catch (error) {
    return admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
};

const adminApp = getAdminApp();
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const getOAuth2Client = (origin: string) => {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  };

  // API Routes
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.get("/api/auth/google/url", (req, res) => {
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const client = getOAuth2Client(`${protocol}://${host}`);
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'select_account'
    });
    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const client = getOAuth2Client(`${protocol}://${host}`);
    const { code } = req.query;
    try {
      const { tokens } = await client.getToken(code as string);
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      const email = payload?.email;

      if (email === 'guptakundan1984k@gmail.com') {
        await db.collection('settings').doc('google_drive').set({
          tokens,
          email,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.send("Authentication Successful! You can close this window now.");
      } else {
        res.status(403).send("Unauthorized");
      }
    } catch (error: any) {
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/storage/google-drive/info", async (req, res) => {
    try {
      const doc = await db.collection('settings').doc('google_drive').get();
      if (!doc.exists) return res.status(404).json({ connected: false });
      const data = doc.data()!;
      const client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
      client.setCredentials(data.tokens);
      const drive = google.drive({ version: 'v3', auth: client });
      const response = await drive.about.get({ fields: 'storageQuota,user' });
      res.json({ connected: true, email: data.email, quota: response.data.storageQuota, user: response.data.user });
    } catch (error: any) {
      res.status(500).json({ connected: false, error: error.message });
    }
  });

  app.post("/api/admin/update-password", async (req, res) => {
    const { uid, newPassword, adminUid } = req.body;
    try {
      const adminDoc = await db.collection('users').doc(adminUid).get();
      if (adminDoc.data()?.role !== 'admin') return res.status(403).json({ success: false, message: "Unauthorized" });
      await admin.auth().updateUser(uid, { password: newPassword });
      await db.collection('users').doc(uid).update({ password: newPassword });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
