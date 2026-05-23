import { messaging, getToken, db, doc, updateDoc, arrayUnion } from '../firebase';
import { UserProfile } from '../types';

export const notificationService = {
  async requestPermission(userId: string) {
    if (!messaging) return null;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: 'BGHQ_F2Y8_W4_1_V_L_K_A_S_T_O_R_E_P_H_O_N_E_P_U_S_H_V_A_P_I_D' // Placeholder: User should provide a real one or system defaults
        });

        if (token) {
          await this.saveToken(userId, token);
          return token;
        }
      }
    } catch (error) {
      console.error('Error getting notification permission:', error);
    }
    return null;
  },

  async saveToken(userId: string, token: string) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token)
      });
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  },

  // Helper to send notification via server
  async sendNotification(data: { 
    userIds: string[], 
    title: string, 
    body: string, 
    type: 'order' | 'promotion' 
  }) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false };
    }
  },

  // Direct trigger to notify admin numbers via Exotel SMS API instantly
  async triggerSMSNotification(orderId: string, orderData: any) {
    try {
      const response = await fetch('/api/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderData })
      });
      return await response.json();
    } catch (error) {
      console.error('Error triggering SMS notification:', error);
      return { success: false };
    }
  }
};
