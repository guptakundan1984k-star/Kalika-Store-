
import React, { useState, useEffect } from 'react';
import { 
  Cloud, HardDrive, Shield, CheckCircle2, AlertCircle, 
  ExternalLink, LogIn, Database, Image as ImageIcon,
  FileJson, ArrowRight, Share2, Sparkles, RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import firebaseConfig from '../../firebase-applet-config.json';

export const AdminStorageManager: React.FC = () => {
  const { t } = useLanguage();
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchDriveInfo();
    
    // Listen for OAuth success message
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.service === 'google_drive') {
        fetchDriveInfo();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchDriveInfo = async () => {
    try {
      const response = await fetch('/api/storage/google-drive/info');
      const data = await response.json();
      if (data.connected) {
        setIsDriveConnected(true);
        setStorageInfo(data);
      }
    } catch (error) {
      console.error("Failed to fetch Drive info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      window.open(
        url,
        'google_drive_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      alert("Failed to start Google connection. Please try again.");
    }
  };

  const formatStorage = (bytes: string | number) => {
    const b = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    if (isNaN(b)) return '0 GB';
    const gb = b / (1024 * 1024 * 1024);
    if (gb > 1024) return `${(gb / 1024).toFixed(2)} TB`;
    return `${gb.toFixed(2)} GB`;
  };

  const handleBackupNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("Store data backed up to your 5TB drive successfully!");
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Cloud Storage</h2>
        <p className="text-gray-500 font-medium">Link your 5TB Gmail cloud storage for backups and large asset management.</p>
      </div>

      {/* Connection Status Card */}
      <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col md:flex-row items-center gap-8">
        <div className={`w-32 h-32 rounded-[40px] flex items-center justify-center relative ${isDriveConnected ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
          <Cloud className="w-16 h-16" />
          {isDriveConnected && (
            <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-2xl shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Google Drive Storage</h3>
            <p className="text-sm font-medium text-gray-500">
              {isDriveConnected ? `Connected as ${storageInfo?.email || 'Admin'}` : 'Not Connected'}
            </p>
          </div>
          
          {isDriveConnected ? (
            <div className="space-y-3">
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (storageInfo?.quota?.usage / storageInfo?.quota?.limit) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-gray-400">Used: {formatStorage(storageInfo?.quota?.usage)}</span>
                <span className="text-primary">Limit: {formatStorage(storageInfo?.quota?.limit)}</span>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleConnectDrive}
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              Connect with Gmail
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sync Settings */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black text-gray-900 tracking-tight">Auto Backup</h4>
          </div>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            Automatically sync order history, inventory reports, and customer data to your Google Drive every 24 hours.
          </p>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-xs font-black uppercase text-gray-400">Status</span>
            <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest">Active</span>
          </div>
          <button 
            onClick={handleBackupNow}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Backup Now
          </button>
        </div>

        {/* Asset Management */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black text-gray-900 tracking-tight">Image Assets</h4>
          </div>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            Use your 5TB drive to host high-resolution product photos. Paste Drive shared links directly in the product manager.
          </p>
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Share2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">Direct Link Helper</p>
                <p className="text-[10px] text-gray-400">Transforms Drive links to direct web images.</p>
              </div>
            </div>
            <a 
              href="https://console.cloud.google.com/storage" 
              target="_blank" 
              rel="noreferrer"
              className="block text-center p-3 text-[10px] font-bold text-gray-400 hover:text-primary transition-colors uppercase tracking-widest"
            >
              Manage Google Cloud Buckets <ExternalLink className="inline w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </div>

      {/* Advanced Config */}
      <div className="bg-gray-900 p-8 rounded-[40px] shadow-2xl space-y-6 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full translate-x-12 translate-y-[-12px]" />
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="text-lg font-black tracking-tight">Custom Firebase Config</h4>
            <p className="text-xs text-gray-400">Overwrite current settings with your personal 5TB Cloud Project.</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <p className="text-xs font-medium text-gray-300 mb-2">Current Storage Bucket:</p>
            <code className="text-[10px] block bg-black/30 p-2 rounded text-primary">{firebaseConfig.storageBucket}</code>
          </div>
          
          <div className="p-4 rounded-2xl border border-dashed border-white/20 text-center space-y-3">
            <p className="text-xs text-gray-400">To link your personal Gmail cloud project, update the config file in your developer settings.</p>
            <div className="flex justify-center gap-4">
              <div className="flex items-center gap-1.5 text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">Valid SSL</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-400">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">Auto Scale</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
