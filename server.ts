import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { google } from "googleapis";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// Helper to send SMS via Exotel API
async function sendSMSViaExotel(toPhone: string, messageBody: string): Promise<boolean> {
  const accountSid = process.env.EXOTEL_ACCOUNT_SID;
  const apiKey = process.env.EXOTEL_API_KEY;
  const apiToken = process.env.EXOTEL_API_TOKEN;
  const subdomain = process.env.EXOTEL_SUBDOMAIN || "api.exotel.com";
  const senderId = process.env.EXOTEL_SENDER_ID || "08047191112"; // User virtual number or sender ID

  if (!accountSid || !apiKey || !apiToken) {
    console.warn(`[SMS Service] Exotel credentials missing. SMS not sent to ${toPhone}. Check EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, and EXOTEL_API_TOKEN in .env.`);
    return false;
  }

  try {
    const endpoint = `https://${subdomain}/v1/Accounts/${accountSid}/Sms/send.json`;
    const auth = Buffer.from(`${apiKey}:${apiToken}`).toString("base64");
    
    const params = new URLSearchParams();
    params.append("From", senderId);
    params.append("To", toPhone);
    params.append("Body", messageBody);

    console.log(`[SMS Service] Dispatching SMS to ${toPhone} via ${endpoint}...`);
    const response = await axios.post(endpoint, params, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    console.log(`[SMS Service] Exotel API response for ${toPhone}:`, response.data);
    return true;
  } catch (error: any) {
    console.error(`[SMS Service] Failed to send SMS to ${toPhone}:`, error.response?.data || error.message);
    return false;
  }
}

// Load firebase config
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
}

const getAdminApp = () => {
  if (admin.apps.length > 0) return admin.apps[0];
  
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  
  try {
    // Try to initialize with default credentials first
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId,
    });
  } catch (error: any) {
    console.warn('Firebase Admin: Failed to initialize with applicationDefault(), falling back to basic initialization.', error.message);
    return admin.initializeApp({
      projectId: projectId,
    });
  }
};

const adminApp = getAdminApp();
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId || '(default)');

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

  // In-memory registry to avoid sending duplicate SMS notifications for the same order
  const sentSMSOrders = new Set<string>();

  // Central helper to dispatch SMS for an order, with deduplication
  async function triggerOrderPlacedSMSNotification(orderId: string, orderData: any): Promise<boolean> {
    if (sentSMSOrders.has(orderId)) {
      console.log(`[SMS Service] Order #${orderId} already notified. Skipping duplicate SMS request.`);
      return false;
    }
    sentSMSOrders.add(orderId);

    const targetNumbers = ["6205284423", "9608123427"];
    const total = Math.round(orderData.total || 0);
    const customerName = orderData.userName || "Guest Customer";
    const itemsCount = (orderData.items && Array.isArray(orderData.items)) ? orderData.items.length : 0;
    const shortId = orderId.slice(-8).toUpperCase();

    // Using exact words requested by user: "Order placed"
    const message = `Order placed: Kalika Store New Order #${shortId} of Rs ${total} from ${customerName} (${itemsCount} items). Check admin dashboard.`;

    console.log(`[SMS Service] Dispatching real order placed SMS notification for #${orderId} to: ${targetNumbers.join(", ")}`);
    
    let allSuccess = true;
    for (const phone of targetNumbers) {
      const res = await sendSMSViaExotel(phone, message);
      if (!res) allSuccess = false;
    }
    return allSuccess;
  }

  // Expose API for sending SMS manually via Axios
  app.post("/api/send-sms", async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: "Missing phone or message in request body" });
    }
    const success = await sendSMSViaExotel(phone, message);
    if (success) {
      res.json({ success: true, message: `SMS sent successfully to ${phone}` });
    } else {
      res.status(500).json({ success: false, message: `Failed to send SMS to ${phone}. Check server configurations.` });
    }
  });

  // Client-triggered API to send instant order notification
  app.post("/api/notify-order", async (req, res) => {
    const { orderId, orderData } = req.body;
    if (!orderId || !orderData) {
      return res.status(400).json({ success: false, message: "Missing orderId or orderData" });
    }
    
    try {
      const success = await triggerOrderPlacedSMSNotification(orderId, orderData);
      res.json({ success: true, message: "Notification handled", smsDispatched: success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Setup live background order received listener to push notifications to admin phones automatically as a fallback
  try {
    const serverBootTime = Date.now();
    console.log(`[SMS Service] Initializing Firestore background listener of orders collection...`);
    
    db.collection('orders').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const orderData = change.doc.data();
          const orderId = change.doc.id;
          
          const createdAt = orderData.createdAt || 0;
          // Filter to only new orders placed after server is up
          if (createdAt > serverBootTime) {
            console.log(`[SMS Service] Fallback listener detected new Order: #${orderId}. Running trigger...`);
            await triggerOrderPlacedSMSNotification(orderId, orderData);
          }
        }
      });
    }, (error) => {
      console.error(`[SMS Service] Firestore listener error:`, error);
    });
  } catch (err: any) {
    console.error(`[SMS Service] Failed to initialize Firestore listener:`, err.message);
  }

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

  app.post("/api/notifications/send", async (req, res) => {
    const { userIds, title, body, type } = req.body;
    try {
      const tokens: string[] = [];
      
      // Fetch tokens for all users
      for (const userId of userIds) {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
          // Filter by preference if provided
          const prefs = userData.notificationPreferences;
          const shouldSend = !prefs || (type === 'order' && prefs.orderUpdates) || (type === 'promotion' && prefs.promotions);
          
          if (shouldSend) {
            tokens.push(...userData.fcmTokens);
          }
        }
      }

      if (tokens.length === 0) {
        return res.json({ success: true, message: "No tokens found" });
      }

      const response = await admin.messaging().sendEachForMulticast({
        tokens: [...new Set(tokens)], // Distinct tokens
        notification: { title, body },
        data: { type }
      });

      res.json({ success: true, response });
    } catch (error: any) {
      console.error('FCM Error Details:', JSON.stringify(error, null, 2));
      
      let hint = "Check Firebase Console to ensure FCM API is enabled.";
      if (error.code === 'messaging/permission-denied' || error.message.includes('PERMISSION_DENIED')) {
        const projectId = admin.app().options.projectId;
        hint = `IMPORTANT: Please ensure the "Firebase Cloud Messaging API" is enabled for project "${projectId}". 
        Visit: https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=${projectId}
        Also verify that your service account has the "Firebase Messaging Admin" role.`;
        console.error(hint);
      }

      res.status(500).json({ 
        success: false, 
        error: error.message,
        code: error.code,
        hint: hint
      });
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
