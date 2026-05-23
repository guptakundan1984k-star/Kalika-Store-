import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, X, CheckCircle, Bluetooth, AlertCircle } from 'lucide-react';
import { BluetoothPrinterManager, buildEscPosBytes, printViaIframe } from '../services/printerService';
import { Order } from '../types';

interface POSSale {
  id: string;
  timestamp: number;
  items: {
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'Cash' | 'UPI';
  customerName?: string;
  customerPhone?: string;
}

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  sale?: POSSale | null;
  onConfirmPrint?: () => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  order,
  sale,
  onConfirmPrint
}) => {
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || (!order && !sale)) return null;

  // Unify the receipt data
  const isPosSale = !!sale;
  const id = isPosSale ? sale.id : order!.id;
  const createdAt = isPosSale ? sale.timestamp : order!.createdAt;
  const userName = isPosSale ? (sale.customerName || 'Guest Customer') : (order!.userName || 'Guest Customer');
  const userPhone = isPosSale ? (sale.customerPhone || 'N/A') : (order!.userPhone || 'N/A');
  const deliveryType = isPosSale ? 'Walk-in' : order!.deliveryType;
  const paymentMethod = isPosSale ? sale.paymentMethod : (order!.paymentMethod || 'COD');
  
  const items = isPosSale 
    ? sale.items.map(itm => ({
        name: itm.productName,
        quantity: itm.quantity,
        price: itm.price,
        subtotal: itm.subtotal
      }))
    : order!.items.map(itm => ({
        name: itm.name,
        quantity: itm.quantity,
        price: itm.price,
        subtotal: itm.price * itm.quantity
      }));

  const total = isPosSale ? sale.total : order!.total;

  // Compile normal Order structure for helper library use if we need to call standard printers
  const standardOrderObject: Order = isPosSale 
    ? {
        id,
        createdAt,
        userName,
        userPhone,
        deliveryType: 'Takeaway',
        paymentMethod: paymentMethod as any,
        total,
        pin: '000000',
        userId: 'pos_cashier',
        items: sale.items.map((itm, index) => ({
          id: `pos_itm_${index}`,
          name: itm.productName,
          quantity: itm.quantity,
          price: itm.price,
          category: 'POS',
          description: '',
          image: '',
          stock: 999,
          createdAt: Date.now()
        }))
      } as any
    : order!;

  const handleBluetoothPrint = async () => {
    setPrintStatus('printing');
    setErrorMessage('');
    try {
      const bytes = buildEscPosBytes(standardOrderObject);
      const success = await BluetoothPrinterManager.sendBytesToPrinter(bytes);
      if (success) {
        setPrintStatus('success');
        setTimeout(() => {
          setPrintStatus('idle');
          if (onConfirmPrint) onConfirmPrint();
        }, 1500);
      } else {
        throw new Error("No paired Bluetooth printer is currently active, connected under manager. Switch to browser print or pair first.");
      }
    } catch (err: any) {
      console.error(err);
      setPrintStatus('error');
      setErrorMessage(err.message || "Failed to communicate with Bluetooth printer.");
    }
  };

  const handleBrowserFallbackPrint = () => {
    printViaIframe(standardOrderObject);
    if (onConfirmPrint) {
      onConfirmPrint();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[32px] shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden flex flex-col my-8"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div>
              <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-primary" />
                Receipt Print Preview
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">2-Inch (58mm) Thermal tape layout</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Main Scrollable Section */}
          <div className="p-6 flex-1 bg-gray-100 overflow-y-auto max-h-[460px] flex justify-center">
            {/* Styled Thermal Paper Cut Replica */}
            <div className="bg-white w-[270px] p-4 shadow-lg border border-dashed border-gray-300 rounded-sm relative text-black font-mono leading-relaxed" style={{ fontSize: '11px' }}>
              
              {/* Jagged / Scallop top simulation */}
              <div className="absolute top-[-4px] left-0 right-0 h-1 flex justify-between overflow-hidden">
                {Array.from({ length: 27 }).map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 bg-gray-100 rotate-45 transform origin-top-left shrink-0 border-l border-b border-gray-300" style={{ marginTop: '2px' }} />
                ))}
              </div>

              {/* Title Header */}
              <div className="text-center pt-2 pb-1">
                <h4 className="font-extrabold text-xs uppercase text-gray-900 tracking-wider">KALIKA STORE</h4>
                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Automated Receipt Terminal</p>
                <p className="text-[8px] text-gray-400">Opp. Krishi Bazaar, Ranchi</p>
                <p className="text-[8px] text-gray-400">Tel: {userPhone !== 'N/A' ? userPhone : 'Store Direct'}</p>
              </div>

              {/* Dotted border separator */}
              <div className="border-t border-dashed border-gray-300 my-2" />

              {/* Metadata */}
              <div className="text-[9px] space-y-0.5 text-gray-600">
                <div><b>ORDER:</b> #{id.slice(-8).toUpperCase()}</div>
                <div><b>DATE:</b> {new Date(createdAt).toLocaleString('en-IN')}</div>
                <div><b>CUST:</b> {userName}</div>
                <div><b>DELIVERY:</b> {deliveryType.toUpperCase()}</div>
                <div><b>PAYMENT:</b> {paymentMethod}</div>
              </div>

              {/* Dotted border separator */}
              <div className="border-t border-dashed border-gray-300 my-2" />

              {/* Items Table */}
              <table className="w-full text-left" style={{ fontSize: '9px' }}>
                <thead>
                  <tr className="border-b border-dashed border-gray-300 text-gray-600">
                    <th className="font-extrabold pb-1 uppercase text-[8px]" style={{ width: '45%' }}>ITEM</th>
                    <th className="font-extrabold pb-1 uppercase text-center text-[7px]" style={{ width: '15%' }}>QTY</th>
                    <th className="font-extrabold pb-1 uppercase text-right text-[7px]" style={{ width: '20%' }}>PRICE</th>
                    <th className="font-extrabold pb-1 uppercase text-right text-[7px]" style={{ width: '20%' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-gray-200">
                  {items.map((itm, idx) => (
                    <tr key={idx}>
                      <td className="py-1 text-gray-900 font-extrabold break-words max-w-[110px]" style={{ fontSize: '10px' }}>{itm.name}</td>
                      <td className="py-1 text-center text-gray-500 font-bold" style={{ fontSize: '9px' }}>{itm.quantity}</td>
                      <td className="py-1 text-right text-gray-500 font-semibold" style={{ fontSize: '9px' }}>₹{Math.round(itm.price)}</td>
                      <td className="py-1 text-right text-gray-900 font-extrabold" style={{ fontSize: '9px' }}>₹{Math.round(itm.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Dotted border separator */}
              <div className="border-t border-dashed border-gray-300 my-2" />

              {/* Total Section */}
              <div className="text-right py-1">
                <span className="text-[12px] font-black uppercase text-gray-900">GRAND TOTAL: ₹{Math.round(total)}</span>
              </div>

              {/* Dotted border separator */}
              <div className="border-t border-dashed border-gray-300 my-2" />

              {/* Footer text */}
              <div className="text-center text-[8px] text-gray-400 space-y-0.5 pt-1">
                <p className="font-bold uppercase text-gray-600">THANK YOU FOR YOUR ORDER!</p>
                <p>Bluetooth Print Preview Mode</p>
                <p className="text-[7px]">Kalika Retail Superstore Ltd.</p>
              </div>

              {/* Jagged / Scallop bottom simulation */}
              <div className="absolute bottom-[-5px] left-0 right-0 h-1.5 flex justify-between overflow-hidden">
                {Array.from({ length: 27 }).map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 bg-gray-100 rotate-45 transform origin-bottom-left shrink-0 border-r border-t border-gray-300" style={{ bottom: '2px' }} />
                ))}
              </div>

            </div>
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t border-gray-100 space-y-3 bg-white">
            {printStatus === 'printing' && (
              <div className="flex items-center gap-3 bg-blue-50 text-blue-700 px-4 py-3 rounded-2xl text-xs font-semibold animate-pulse border border-blue-100">
                <Bluetooth className="w-5 h-5 text-blue-600 animate-bounce" />
                <span>Transmitting print job bytes over Bluetooth GATT...</span>
              </div>
            )}

            {printStatus === 'success' && (
              <div className="flex items-center gap-3 bg-green-50 text-green-700 px-4 py-3 rounded-2xl text-xs font-black border border-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Dispatch succeeded! Check thermal spool.</span>
              </div>
            )}

            {printStatus === 'error' && (
              <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Bluetooth Transmission Failed</span>
                </div>
                <p className="text-[10px] opacity-90 leading-relaxed font-bold font-mono">{errorMessage}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleBluetoothPrint}
                disabled={printStatus === 'printing'}
                className="bg-primary text-white font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 outline-none hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              >
                <Bluetooth className="w-4 h-4" />
                BT Print
              </button>
              
              <button
                onClick={handleBrowserFallbackPrint}
                disabled={printStatus === 'printing'}
                className="bg-gray-100 text-gray-700 font-extrabold py-3.5 px-4 rounded-2xl hover:bg-gray-200 transition-all uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 outline-none hover:scale-[1.01] active:scale-95"
              >
                <Printer className="w-4 h-4" />
                System Print
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full text-center py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest text-[9px] mt-1"
            >
              Cancel & Return to POS
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
