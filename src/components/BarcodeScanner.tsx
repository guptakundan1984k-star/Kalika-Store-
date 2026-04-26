import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const readerId = "barcode-reader";
    
    const startScanner = async () => {
      try {
        setIsInitializing(true);
        setError(null);
        
        scannerRef.current = new Html5Qrcode(readerId);
        
        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 150 },
        };

        await scannerRef.current.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (scannerRef.current) {
              scannerRef.current.stop().then(() => {
                onScan(decodedText);
              }).catch(() => {
                onScan(decodedText);
              });
            }
          },
          () => {} // Ignore scan failures
        );
        
        setIsInitializing(false);
      } catch (err: any) {
        console.error("Camera access error:", err);
        setError("Could not access camera. Please ensure permissions are granted.");
        setIsInitializing(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(e => console.error("Cleanup error", e));
      }
    };
  }, [onScan]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <div className="bg-white w-full max-w-md rounded-[40px] overflow-hidden relative shadow-2xl border border-white/20">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Scan Barcode</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Point camera at product label</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-all hover:rotate-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 relative min-h-[300px] flex items-center justify-center bg-black">
          <div id="barcode-reader" className="w-full rounded-3xl overflow-hidden" />
          
          {(isInitializing || error) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-6 text-center">
              {isInitializing ? (
                <>
                  <RefreshCw className="w-10 h-10 text-white animate-spin mb-4" />
                  <p className="text-white font-bold text-sm">Accessing Camera...</p>
                </>
              ) : (
                <>
                  <Camera className="w-12 h-12 text-red-400 mb-4" />
                  <p className="text-white font-bold mb-4">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-white text-black px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="p-8 bg-gray-50 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 mb-3">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Auto-Detection Active</span>
          </div>
          <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">
            Hold the barcode within the box for instant scanning
          </p>
        </div>
      </div>
    </motion.div>
  );
};
