import React, { useState } from 'react';
import { Megaphone, Send, Users, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { notificationService } from '../services/notificationService';

interface AdminPromotionManagerProps {
  users: UserProfile[];
}

export const AdminPromotionManager: React.FC<AdminPromotionManagerProps> = ({ users }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const registeredUsersCount = users.filter(u => u.fcmTokens && u.fcmTokens.length > 0).length;

  const handleSend = async () => {
    if (!title || !body) return;
    setIsSending(true);
    setStatus('idle');

    try {
      // Get all user IDs who have tokens
      const targetUserIds = users
        .filter(u => u.fcmTokens && u.fcmTokens.length > 0)
        .map(u => u.uid);

      if (targetUserIds.length === 0) {
        alert("No users have push notifications enabled yet.");
        setIsSending(false);
        return;
      }

      await notificationService.sendNotification({
        userIds: targetUserIds,
        title,
        body,
        type: 'promotion'
      });

      setStatus('success');
      setTitle('');
      setBody('');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error("Failed to send promotion:", error);
      setStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-indigo-600 via-primary to-primary-dark p-12 rounded-[50px] text-white relative overflow-hidden shadow-2xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-inner">
              <Megaphone className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black tracking-tight leading-none">Promotion Center</h3>
              <p className="text-indigo-100 font-medium tracking-wide flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Drive sales with instant push notifications
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 flex items-center gap-4">
              <Users className="w-6 h-6" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Reachable Users</p>
                <p className="text-2xl font-black">{registeredUsersCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-8 max-w-2xl mx-auto">
        <div className="space-y-2">
          <h4 className="text-xl font-black text-gray-900 tracking-tight">Create Promotion</h4>
          <p className="text-sm text-gray-500 font-medium">This will be sent to all users who have enabled notifications.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Notification Title</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekend Flash Sale! ⚡"
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 font-bold text-gray-900 focus:bg-white focus:border-primary/20 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Notification Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g., Get 50% OFF on all fresh vegetables this Sunday! Use code FRESH50."
              rows={4}
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 font-bold text-gray-900 focus:bg-white focus:border-primary/20 transition-all outline-none resize-none"
            />
          </div>

          <div className="pt-4">
            <button 
              onClick={handleSend}
              disabled={isSending || !title || !body}
              className={`w-full flex items-center justify-center gap-3 py-6 rounded-3xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-xl ${
                isSending 
                  ? 'bg-gray-100 text-gray-400' 
                  : 'bg-primary text-white shadow-primary/20 hover:bg-primary-dark'
              }`}
            >
              {isSending ? (
                <>
                  <div className="w-5 h-5 border-4 border-gray-300 border-t-primary rounded-full animate-spin" />
                  Sending Broadcast...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Notification Now
                </>
              )}
            </button>
          </div>

          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-green-50 rounded-3xl border border-green-100 flex items-center gap-4 text-green-600"
            >
              <CheckCircle2 className="w-6 h-6" />
              <p className="text-sm font-bold tracking-tight">Promotion broadcasted successfully!</p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-red-50 rounded-3xl border border-red-100 flex items-center gap-4 text-red-600"
            >
              <AlertCircle className="w-6 h-6" />
              <p className="text-sm font-bold tracking-tight">Failed to broadcast promotion. Please try again.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
