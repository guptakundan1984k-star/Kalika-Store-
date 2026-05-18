import React, { useState, useEffect } from 'react';
import { db, doc, onSnapshot, setDoc, handleFirestoreError, OperationType } from '../firebase';
import { StoreSettings } from '../types';
import { Clock, Store, Save, AlertCircle, CheckCircle2, Zap, Plus, X } from 'lucide-react';
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
        // Initialize with user requested defaults
        const initial: StoreSettings = {
          isOpen: true,
          autoSchedule: true,
          openingTime: '10:40',
          closingTime: '20:00',
          sundayOpeningTime: '10:40',
          sundayClosingTime: '15:00',
          isVoiceSupportEnabled: true,
          isDeliveryEnabled: true,
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

  const toggleStore = async () => {
    if (!settings) return;
    const newStatus = !settings.isOpen;
    setSettings(prev => prev ? { ...prev, isOpen: newStatus } : null);
    try {
      await setDoc(doc(db, 'settings', 'store'), {
        isOpen: newStatus,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error("Failed to toggle store:", error);
    }
  };

  const toggleAutoSchedule = async () => {
    if (!settings) return;
    const newStatus = !settings.autoSchedule;
    setSettings(prev => prev ? { ...prev, autoSchedule: newStatus } : null);
    try {
      await setDoc(doc(db, 'settings', 'store'), {
        autoSchedule: newStatus,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error("Failed to toggle schedule:", error);
    }
  };

  const toggleFeature = async (feature: 'isVoiceSupportEnabled' | 'isDeliveryEnabled') => {
    if (!settings) return;
    const newStatus = !settings[feature];
    setSettings(prev => prev ? { ...prev, [feature]: newStatus } : null);
    try {
      await setDoc(doc(db, 'settings', 'store'), {
        [feature]: newStatus,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error(`Failed to toggle ${feature}:`, error);
    }
  };

  const handleResetCatalog = async () => {
    const mode = window.confirm("Do you want to KEEP 'Sudha milk' and delete all other products? (OK for Keep Milk, Cancel for Delete All)") ? 'selective' : 'all';
    
    if (window.confirm(`⚠️ DANGER: This will delete ${mode === 'selective' ? 'all products EXCEPT Sudha milk' : 'EVERY product'} permanently. Proceed?`)) {
      const confirmText = window.prompt(`Type 'DELETE CATALOG' to confirm permanent deletion:`);
      if (confirmText === 'DELETE CATALOG') {
        const { collection, getDocs, deleteDoc, doc, writeBatch } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        setSaving(true);
        try {
          const snapshot = await getDocs(collection(db, 'products'));
          let deletedCount = 0;
          
          // Firebase batch limit is 500
          for (let i = 0; i < snapshot.docs.length; i += 500) {
            const batch = writeBatch(db);
            const chunk = snapshot.docs.slice(i, i + 500);
            chunk.forEach(d => {
              const data = d.data();
              const isSudhaMilk = data.name && data.name.toLowerCase().includes('sudha milk');
              if (mode === 'all' || !isSudhaMilk) {
                batch.delete(d.ref);
                deletedCount++;
              }
            });
            await batch.commit();
          }
          alert(`Successfully removed ${deletedCount} products. Catalog updated!`);
          window.location.reload();
        } catch (error) {
          console.error("Reset failed:", error);
          alert("Failed to reset catalog. Please check permissions.");
        } finally {
          setSaving(false);
        }
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      await setDoc(doc(db, 'settings', 'store'), {
        ...settings,
        updatedAt: Date.now()
      }, { merge: true });
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

      <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 mb-8 mt-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white rounded-2xl text-red-500 shadow-sm">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-red-900 tracking-tight">Danger Zone</h3>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Permanent Store Reset</p>
          </div>
        </div>
        <p className="text-sm font-bold text-red-600/70 mb-6 max-w-lg">
          Going live? Resetting the catalog will permanently delete all demo products from your store.
        </p>
        <button 
          type="button"
          onClick={handleResetCatalog}
          className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/20 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Resetting...' : 'Reset Product Catalog'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Basic Information</h3>
              <p className="text-sm font-medium text-gray-500">Store identity and contact details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Store Name</label>
              <input
                type="text"
                value={settings?.storeName || 'Kalika Store'}
                onChange={(e) => setSettings(prev => prev ? { ...prev, storeName: e.target.value } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Contact Number</label>
              <input
                type="text"
                value={settings?.contactPhone || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, contactPhone: e.target.value } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Store Email</label>
              <input
                type="email"
                value={settings?.contactEmail || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, contactEmail: e.target.value } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Logo URL</label>
              <input
                type="text"
                value={settings?.logoUrl || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, logoUrl: e.target.value } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Physical Address</label>
              <textarea
                value={settings?.storeAddress || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, storeAddress: e.target.value } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none min-h-[80px]"
              />
            </div>
          </div>
        </div>

        {/* Delivery Configuration */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Delivery Configuration</h3>
              <p className="text-sm font-medium text-gray-500">Manage delivery fees and free shipping thresholds.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Standard Delivery Fee (₹)</label>
              <input
                type="number"
                value={settings?.deliveryFee ?? 30}
                onChange={(e) => setSettings(prev => prev ? { ...prev, deliveryFee: parseInt(e.target.value) || 0 } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Free Delivery Above (₹)</label>
              <input
                type="number"
                value={settings?.freeDeliveryThreshold ?? 500}
                onChange={(e) => setSettings(prev => prev ? { ...prev, freeDeliveryThreshold: parseInt(e.target.value) || 0 } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Feature Switches */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Smart Features</h3>
              <p className="text-sm font-medium text-gray-500">Toggle AI Assistant and Voice Support features.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="space-y-1 text-left">
              <span className={`text-[10px] font-black uppercase tracking-widest ${settings?.isDeliveryEnabled !== false ? 'text-primary' : 'text-gray-400'}`}>
                Home Delivery: {settings?.isDeliveryEnabled !== false ? 'ENABLED' : 'DISABLED'}
              </span>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                {settings?.isDeliveryEnabled !== false ? 'Customers can order for delivery.' : 'Only Takeaway is allowed.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleFeature('isDeliveryEnabled')}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings?.isDeliveryEnabled !== false ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-300 ${
                  settings?.isDeliveryEnabled !== false ? 'translate-x-11' : 'translate-x-1'
                } shadow-md`}
              />
            </button>
          </div>

          {/* Admin WhatsApp Numbers */}
          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Notification Numbers</span>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">WhatsApp numbers for new orders</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const num = prompt("Enter WhatsApp Number (with country code, e.g., 918002914323):");
                  if (num && num.length >= 10) {
                    const current = settings?.adminWhatsAppNumbers || [];
                    if (!current.includes(num)) {
                      setSettings(prev => prev ? { ...prev, adminWhatsAppNumbers: [...current, num] } : null);
                    }
                  }
                }}
                className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(settings?.adminWhatsAppNumbers || ['918002914323']).map((num, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-xs font-black text-gray-900">{num}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = settings?.adminWhatsAppNumbers || [];
                      setSettings(prev => prev ? { ...prev, adminWhatsAppNumbers: current.filter(n => n !== num) } : null);
                    }}
                    className="p-1 text-red-500 hover:bg-red-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            {(!settings?.adminWhatsAppNumbers || settings.adminWhatsAppNumbers.length === 0) && (
              <p className="text-[10px] text-orange-500 font-bold uppercase py-2">⚠️ At least one number is recommended.</p>
            )}
          </div>

          <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="space-y-1 text-left">
              <span className={`text-[10px] font-black uppercase tracking-widest ${settings?.isVoiceSupportEnabled !== false ? 'text-primary' : 'text-gray-400'}`}>
                Voice Support (Customer End): {settings?.isVoiceSupportEnabled !== false ? 'ENABLED' : 'DISABLED'}
              </span>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                {settings?.isVoiceSupportEnabled !== false ? 'Voice search and accessibility is ON.' : 'Voice features are hidden.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleFeature('isVoiceSupportEnabled')}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings?.isVoiceSupportEnabled !== false ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-300 ${
                  settings?.isVoiceSupportEnabled !== false ? 'translate-x-11' : 'translate-x-1'
                } shadow-md`}
              />
            </button>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${settings?.isFunctionallyOpen ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Main Store Access</h3>
              <p className="text-sm font-medium text-gray-500">Enable or disable the store for taking orders.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="space-y-1 text-left">
              <span className={`text-[10px] font-black uppercase tracking-widest ${settings?.isOpen ? 'text-green-600' : 'text-red-500'}`}>
                Master Switch: {settings?.isOpen ? 'ON (OPEN)' : 'OFF (CLOSED)'}
              </span>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                {settings?.isOpen ? 'Store is manually active.' : 'Store is manually closed (Overrides Schedule).'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleStore}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings?.isOpen ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-300 ${
                  settings?.isOpen ? 'translate-x-11' : 'translate-x-1'
                } shadow-md`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="space-y-1 text-left">
              <span className={`text-[10px] font-black uppercase tracking-widest ${settings?.autoSchedule ? 'text-primary' : 'text-gray-400'}`}>
                Automatic Schedule: {settings?.autoSchedule ? 'ENABLED' : 'DISABLED'}
              </span>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                {settings?.autoSchedule ? 'Follows Daily Hours Automatically.' : 'Accept Orders 24/7 (Ignore Hours).'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAutoSchedule}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings?.autoSchedule ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-300 ${
                  settings?.autoSchedule ? 'translate-x-11' : 'translate-x-1'
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
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Mon-Sat Opening Time</label>
              <input
                type="time"
                value={settings?.openingTime || '10:40'}
                onChange={(e) => setSettings(prev => prev ? { ...prev, openingTime: e.target.value } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Mon-Sat Closing Time</label>
              <input
                type="time"
                value={settings?.closingTime || '20:00'}
                onChange={(e) => setSettings(prev => prev ? { ...prev, closingTime: e.target.value } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Sunday Opening Time</label>
              <input
                type="time"
                value={settings?.sundayOpeningTime || '10:40'}
                onChange={(e) => setSettings(prev => prev ? { ...prev, sundayOpeningTime: e.target.value } : null)}
                className="w-full bg-gray-50 border-none rounded-3xl px-6 py-4 text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Sunday Closing Time</label>
              <input
                type="time"
                value={settings?.sundayClosingTime || '15:00'}
                onChange={(e) => setSettings(prev => prev ? { ...prev, sundayClosingTime: e.target.value } : null)}
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
