import React, { useState, useEffect } from 'react';
import { db, doc, onSnapshot, updateDoc, handleFirestoreError, OperationType } from '../firebase';
import { StoreSettings } from '../types';
import { Clock, Store, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminStoreSettings: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as StoreSettings);
      } else {
        // Initialize if not exists
        const initial: StoreSettings = {
          isOpen: true,
          openingTime: '09:00',
          closingTime: '22:00',
          updatedAt: Date.now()
        };
        setSettings(initial);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/store', false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        ...settings,
        updatedAt: Date.now()
      });
      setMessage({ type: 'success', text: 'Store settings updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/store');
      setMessage({ type: 'error', text: 'Failed to update store settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Store Settings</h2>
        <p className="text-gray-500 font-medium">Manage store operating hours and availability status.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Status Toggle */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${settings?.isOpen ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Store Status</h3>
              <p className="text-sm font-medium text-gray-500">Enable or disable the store for taking orders.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="space-y-1">
              <span className={`text-xs font-black uppercase tracking-widest ${settings?.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                Currently {settings?.isOpen ? 'Open' : 'Closed'}
              </span>
              <p className="text-sm text-gray-500 font-medium">
                {settings?.isOpen ? 'Customers can browse and place orders.' : 'Customers can browse but cannot place orders.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => prev ? { ...prev, isOpen: !prev.isOpen } : null)}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings?.isOpen ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-300 ${
                  settings?.isOpen ? 'translate-x-11' : 'translate-x-1'
                } shadow-md`}
              />
            </button>
          </div>

          {!settings?.isOpen && (
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Temporary Message (Optional)</label>
              <textarea
                value={settings?.message || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, message: e.target.value } : null)}
                placeholder="e.g., We are closed for maintenance. Back soon!"
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 placeholder-gray-400 focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none min-h-[100px]"
              />
            </div>
          )}
        </div>

        {/* Operating Hours */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Operating Hours</h3>
              <p className="text-sm font-medium text-gray-500">Set the daily opening and closing times.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Opening Time</label>
              <input
                type="time"
                value={settings?.openingTime || '09:00'}
                onChange={(e) => setSettings(prev => prev ? { ...prev, openingTime: e.target.value } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Closing Time</label>
              <input
                type="time"
                value={settings?.closingTime || '22:00'}
                onChange={(e) => setSettings(prev => prev ? { ...prev, closingTime: e.target.value } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-4">
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 p-4 rounded-2xl ${
                message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-bold uppercase tracking-wider">{message.text}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto self-end flex items-center justify-center gap-3 bg-gray-900 text-white px-12 py-5 rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-gray-900/30 hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none group"
          >
            {saving ? (
              <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
            )}
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
