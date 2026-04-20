import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import { google } from "googleapis";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase config for project ID
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

// Initialize Firebase Admin with explicit ambient credentials and robust initialization check
const getAdminApp = () => {
  if (admin.apps.length > 0) return admin.apps[0];
  
  try {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId,
    });
  } catch (error) {
    console.error("Firebase Admin initialization failed. Falling back to simple init.");
    return admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
};

const adminApp = getAdminApp();
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

// Add descriptive error logging for Firestore initialization
db.listCollections().then(() => {
  console.log(`Successfully connected to Firestore database: ${firebaseConfig.firestoreDatabaseId}`);
}).catch(err => {
  console.error(`Firestore connection error for database ${firebaseConfig.firestoreDatabaseId}:`, err.message);
  if (err.message.includes('PERMISSION_DENIED')) {
    console.error("CRITICAL: Service account lacks IAM permissions for named database. Check if 'Cloud Datastore User' role is assigned.");
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const getOAuth2Client = (req: express.Request) => {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const defaultRedirectUri = `${protocol}://${host}/api/auth/google/callback`;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || defaultRedirectUri;

    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  };

  // Google OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const client = getOAuth2Client(req);
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'select_account'
    });

    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const client = getOAuth2Client(req);
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

        res.send(`
          <html>
            <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9fafb;">
              <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                <h1 style="color: #000; margin-bottom: 0.5rem;">Connection Successful!</h1>
                <p style="color: #6b7280; margin-bottom: 1.5rem;">Your 5TB Gmail storage is now linked to Kalika Store.</p>
                <script>
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', service: 'google_drive' }, '*');
                  setTimeout(() => window.close(), 2000);
                </script>
              </div>
            </body>
          </html>
        `);
      } else {
        res.status(403).send("Unauthorized: Only the store owner can link their Gmail storage.");
      }
    } catch (error: any) {
      console.error("Google OAuth Error:", error);
      res.status(500).send("Authentication failed. Please check your credentials.");
    }
  });

  app.get("/api/storage/google-drive/info", async (req, res) => {
    try {
      const doc = await db.collection('settings').doc('google_drive').get();
      if (!doc.exists) {
        return res.status(404).json({ connected: false });
      }

      const data = doc.data()!;
      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      client.setCredentials(data.tokens);

      const drive = google.drive({ version: 'v3', auth: client });
      const response = await drive.about.get({
        fields: 'storageQuota,user'
      });

      res.json({
        connected: true,
        email: data.email,
        quota: response.data.storageQuota,
        user: response.data.user
      });
    } catch (error: any) {
      console.error("Error fetching Drive info:", error);
      res.status(500).json({ connected: false, error: error.message });
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Kalika Store API is running" });
  });

  // Admin: Update User Password
  app.post("/api/admin/update-password", async (req, res) => {
    const { uid, newPassword, adminUid } = req.body;

    if (!uid || !newPassword || !adminUid) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
      // Verify requester is admin
      const adminDoc = await db.collection('users').doc(adminUid).get();
      const adminData = adminDoc.data();

      if (!adminData || adminData.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Unauthorized: Admin access required" });
      }

      // Update password in Firebase Auth
      await admin.auth().updateUser(uid, {
        password: newPassword
      });

      // Update password in Firestore (as requested by user in previous turns to keep it visible)
      await db.collection('users').doc(uid).update({
        password: newPassword
      });

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to update password" });
    }
  });

  // Mock Vyapar Import API
  app.post("/api/admin/import-vyapar", (req, res) => {
    res.json({ success: true, message: "Data imported successfully from Vyapar" });
  });

  // Mock PhonePe Payment Initiation
  app.post("/api/payments/phonepe/initiate", (req, res) => {
    const { amount, orderId } = req.body;
    res.json({ 
      success: true, 
      url: `https://merchants.phonepe.com/pay?amount=${amount}&orderId=${orderId}`,
      message: "Payment initiated successfully" 
    });
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
