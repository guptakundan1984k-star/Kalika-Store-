import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase config for project ID
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
      const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
      const adminData = adminDoc.data();

      if (!adminData || adminData.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Unauthorized: Admin access required" });
      }

      // Update password in Firebase Auth
      await admin.auth().updateUser(uid, {
        password: newPassword
      });

      // Update password in Firestore (as requested by user in previous turns to keep it visible)
      await admin.firestore().collection('users').doc(uid).update({
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
