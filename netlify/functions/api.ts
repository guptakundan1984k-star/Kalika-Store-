import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import { google } from "googleapis";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Load firebase config from file or environment variables
const getFirebaseConfig = () => {
  // In Netlify, the file is included and should be at the base of the function artifact or root
  const paths = [
    path.join(process.cwd(), 'firebase-applet-config.json'),
    path.join(__dirname, 'firebase-applet-config.json'),
    path.join(__dirname, '..', 'firebase-applet-config.json'), // Fallback if bundled differently
    path.join(__dirname, '..', '..', 'firebase-applet-config.json')
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (e) {
        console.error(`Failed to parse config at ${p}:`, e);
      }
    }
  }
  
  console.warn("No firebase-applet-config.json found, falling back to environment variables");
  // Fallback to environment variables
  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || '(default)',
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };
};

const firebaseConfig = getFirebaseConfig();

const getAdminApp = () => {
  if (admin.apps.length > 0) return admin.apps[0];
  
  const options: any = {
    projectId: firebaseConfig.projectId,
  };

  // If we have a service account in env, use it
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      options.credential = admin.credential.cert(sa);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
    }
  }

  return admin.initializeApp(options);
};

const adminApp = getAdminApp();
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId || '(default)');

const app = express();
app.use(cors());
app.use(express.json());

// Handle both /api and direct paths for netlify function routing
const router = express.Router();

const getOAuth2Client = (origin: string) => {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

// API Routes
router.get("/health", (req, res) => res.json({ status: "ok" }));

router.get("/auth/google/url", (req, res) => {
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

router.get("/auth/google/callback", async (req, res) => {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const client = getOAuth2Client(`${protocol}://${host}`);
  const { code } = req.query;
  try {
    const { tokens } = await client.getToken(code as string);
    const idToken = tokens.id_token;
    if (!idToken) throw new Error("No ID token received");

    const ticket = await client.verifyIdToken({
      idToken,
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
    console.error("Auth Callback Error:", error);
    res.status(500).send("Authentication failed");
  }
});

router.get("/storage/google-drive/info", async (req, res) => {
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

router.post("/admin/update-password", async (req, res) => {
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

// Map routes to both /api and root (for local vs netlify)
app.use('/api', router);
app.use('/', router);

export const handler = serverless(app);
