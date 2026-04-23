
import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { printerService } from '../services/BluetoothPrinterService';
import { recognizeHandwriting } from '../services/geminiService';
import { db, collection, addDoc, storage, ref, uploadBytes, getDownloadURL, handleFirestoreError, OperationType } from '../firebase';
import { 
  Printer, 
  Bluetooth, 
  BluetoothOff, 
  FileText, 
  CheckCircle, 
  Clock, 
  Search,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  Scan,
  Loader2,
  Save,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminBillingManagerProps {
  orders: Order[];
}

export const AdminBillingManager: React.FC<AdminBillingManagerProps> = ({ orders }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // New Bill State
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [newBillItems, setNewBillItems] = useState<{ name: string, quantity: number, price: number }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsConnected(printerService.isConnected());
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await printerService.connect();
      setIsConnected(true);
    } catch (error) {
      alert('Failed to connect to printer. Make sure Bluetooth is on and the printer is in pairing mode.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await printerService.disconnect();
    setIsConnected(false);
  };

  const handlePrint = async (order: Order) => {
    if (!isConnected) {
      alert('Please connect to the Bluetooth printer first.');
      return;
    }

    setIsPrinting(true);
    try {
      await printerService.printOrder(order);
    } catch (error) {
      alert('Printing failed. Please check the printer connection.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleHandwritingScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      // Upload to Storage
      const storageRef = ref(storage, `prescriptions/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setPrescriptionUrl(downloadURL);

      // Analyze with Gemini
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const result = await recognizeHandwriting(base64);
      if (result.items) {
        const itemsWithPrice = result.items.map((item: any) => ({
          ...item,
          price: 0
        }));
        setNewBillItems(prev => [...prev, ...itemsWithPrice]);
      }
    } catch (error) {
      console.error("Handwriting recognition/upload failed", error);
      alert("Failed to process image. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddManualItem = () => {
    setNewBillItems(prev => [...prev, { name: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setNewBillItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setNewBillItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleSaveBill = async () => {
    if (newBillItems.length === 0) return;
    setIsSaving(true);
    try {
      const total = newBillItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const billData = {
        userId: customerPhone || 'Walk-in Customer',
        items: newBillItems,
        total,
        status: 'Delivered',
        deliveryType: 'Takeaway',
        createdAt: Date.now(),
        pin: Math.floor(1000 + Math.random() * 9000).toString(),
        paymentMethod: 'COD',
        prescriptionImage: prescriptionUrl
      };
      
      const docRef = await addDoc(collection(db, 'orders'), billData);
      alert('Bill saved successfully!');
      setIsCreatingBill(false);
      setNewBillItems([]);
      setCustomerPhone('');
      setPrescriptionUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Billing Software</h2>
          <p className="text-sm text-gray-500 font-medium">Generate and print bills via Bluetooth thermal printer.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsCreatingBill(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 font-bold"
          >
            <Plus className="w-5 h-5" />
            Create New Bill
          </button>
          {isConnected ? (
            <button 
              onClick={handleDisconnect}
              className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl shadow-green-500/20 hover:bg-green-600 transition-all active:scale-95 font-bold"
            >
              <Bluetooth className="w-5 h-5" />
              Printer Connected
            </button>
          ) : (
            <button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-bold disabled:opacity-50"
            >
              {isConnecting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <BluetoothOff className="w-5 h-5" />
              )}
              {isConnecting ? 'Connecting...' : 'Connect Printer'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isCreatingBill && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingBill(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 bg-gray-900 flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Create New Bill</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Add items manually or scan handwriting</p>
                  </div>
                </div>
                <button onClick={() => setIsCreatingBill(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Customer Phone / ID</label>
                    <input 
                      type="text" 
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Enter phone number..."
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Scan Handwriting (Hindi/English)</label>
                    <label className="flex items-center justify-center gap-3 w-full bg-primary/10 text-primary border-2 border-dashed border-primary/20 rounded-2xl px-6 py-4 cursor-pointer hover:bg-primary/20 transition-all group">
                      {isScanning ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Scan className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="font-black uppercase tracking-widest text-xs">
                        {isScanning ? 'Analyzing Handwriting...' : 'Upload Prescription/List'}
                      </span>
                      <input type="file" accept="image/*" onChange={handleHandwritingScan} className="hidden" />
                    </label>
                    {prescriptionUrl && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100">
                          <img src={prescriptionUrl} alt="Prescription" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Image Saved</span>
                        <button onClick={() => setPrescriptionUrl('')} className="text-red-500 hover:text-red-700">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-gray-900 tracking-tight">Bill Items</h4>
                    <button 
                      onClick={handleAddManualItem}
                      className="flex items-center gap-2 text-primary hover:text-primary-dark font-black uppercase tracking-widest text-[10px]"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item Manually
                    </button>
                  </div>

                  <div className="space-y-3">
                    {newBillItems.map((item, index) => (
                      <div key={`bill-item-${index}`} className="flex flex-col md:flex-row items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100 group">
                        <div className="flex-1 w-full">
                          <input 
                            type="text" 
                            value={item.name}
                            onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                            placeholder="Item name..."
                            className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="w-full md:w-32">
                          <input 
                            type="number" 
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value))}
                            placeholder="Qty"
                            className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold text-center focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="w-full md:w-32">
                          <input 
                            type="number" 
                            value={item.price}
                            onChange={(e) => handleUpdateItem(index, 'price', parseFloat(e.target.value))}
                            placeholder="Price"
                            className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold text-center focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <button 
                          onClick={() => handleRemoveItem(index)}
                          className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    {newBillItems.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[40px]">
                        <p className="text-sm font-bold text-gray-400">No items added yet. Use manual add or scan handwriting.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Estimated Total</span>
                  <span className="text-3xl font-black text-gray-900 tracking-tight">
                    ₹{newBillItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                  </span>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsCreatingBill(false)}
                    className="px-8 py-4 text-sm font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handleSaveBill}
                    disabled={isSaving || newBillItems.length === 0}
                    className="bg-primary text-white px-10 py-4 rounded-2xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 font-black flex items-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save & Generate Bill
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Orders List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search by Order ID or User..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedOrder?.id === order.id ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-gray-900">#{order.id.slice(-6).toUpperCase()}</span>
                        <p className="text-[10px] text-gray-400 font-bold">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          order.status === 'Delivered' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-primary">₹{order.total}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(order);
                          }}
                          className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95"
                          title="Print Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bill Preview */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div 
                key={selectedOrder.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 p-8 sticky top-24"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Bill Preview</h3>
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-3xl p-6 font-mono text-xs space-y-4 border border-gray-100">
                  <div className="text-center space-y-1 border-b border-dashed border-gray-200 pb-4">
                    <h4 className="font-black text-sm">KALIKA STORE</h4>
                    <p>Ranchi, Jharkhand</p>
                    <p>Mob: +91 9608123427</p>
                  </div>

                  {selectedOrder.prescriptionImage && (
                    <div className="border-b border-dashed border-gray-200 pb-4">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Prescription / List</p>
                      <img src={selectedOrder.prescriptionImage} alt="Prescription" className="w-full h-32 object-cover rounded-xl" />
                    </div>
                  )}

                  <div className="space-y-1 border-b border-dashed border-gray-200 pb-4">
                    <p>Order: #{selectedOrder.id.slice(-6).toUpperCase()}</p>
                    <p>Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                    <p>Type: {selectedOrder.deliveryType}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between font-black border-b border-dashed border-gray-200 pb-1">
                      <span>Item</span>
                      <span>Qty</span>
                      <span>Price</span>
                    </div>
                    {selectedOrder.items.map((item, index) => (
                      <div key={`order-item-preview-${selectedOrder.id}-${index}`} className="flex justify-between">
                        <span className="truncate max-w-[100px]">{item.name}</span>
                        <span>x{item.quantity}</span>
                        <span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-gray-200 pt-4 space-y-1 text-right">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{selectedOrder.total}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm">
                      <span>TOTAL:</span>
                      <span>₹{selectedOrder.total}</span>
                    </div>
                  </div>

                  <div className="text-center pt-4 border-t border-dashed border-gray-200">
                    <p>Thank you for shopping!</p>
                  </div>
                </div>

                <button 
                  onClick={() => handlePrint(selectedOrder)}
                  disabled={isPrinting || !isConnected}
                  className="w-full mt-8 flex items-center justify-center gap-3 bg-primary text-white font-black py-5 rounded-3xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50"
                >
                  {isPrinting ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Printer className="w-6 h-6" />
                  )}
                  {isPrinting ? 'Printing...' : 'Print Bill'}
                </button>
                
                {!isConnected && (
                  <p className="text-[10px] text-center text-orange-500 font-bold uppercase tracking-widest mt-4">
                    Connect printer to enable printing
                  </p>
                )}
              </motion.div>
            ) : (
              <div className="bg-white rounded-[40px] border border-dashed border-gray-200 p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mx-auto">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-gray-400">Select an order to preview and print the bill.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
