import React, { useState } from 'react';
import { 
  Search, Filter, Eye, CheckCircle, Truck, Package, Clock, 
  ShieldCheck, XCircle, MoreVertical, ArrowUpRight, ArrowDownRight, Calendar,
  Trash2, FileText, Download, CheckSquare, Square, Bluetooth, Printer, Sparkles, Edit2, Save,
  MapPin, CheckCircle2, ShoppingBag, Navigation, Plus, Minus, AlertCircle, IndianRupee
} from 'lucide-react';
import { Order, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db, doc, deleteDoc, updateDoc, collection, addDoc } from '../firebase';

interface AdminOrderManagerProps {
  orders: Order[];
  products: Product[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onDeliveredWithPayment?: (id: string, receivedAmount: number) => void;
}

export const AdminOrderManager: React.FC<AdminOrderManagerProps> = ({ orders, products, onUpdateStatus, onDeliveredWithPayment }) => {
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);

  // Manual Order State
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [manualOrder, setManualOrder] = useState<{
    customerName: string;
    phone: string;
    address: string;
    items: { id: string, name: string, price: number, quantity: number, image: string }[];
  }>({
    customerName: '',
    phone: '',
    address: '',
    items: []
  });
  const [manualSearch, setManualSearch] = useState('');

  const handleCreateManualOrder = async () => {
    if (!manualOrder.customerName || !manualOrder.phone || !manualOrder.address || manualOrder.items.length === 0) {
      alert("Please fill all customer details and add at least one item.");
      return;
    }

    const total = manualOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder: Order = {
      id: "MAN-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      userId: "manual-" + manualOrder.phone,
      userName: manualOrder.customerName,
      userPhone: manualOrder.phone,
      items: manualOrder.items.map(item => ({
        ...item,
        selectedUnit: 'Piece', // Default
        total: item.price * item.quantity
      })) as any,
      total,
      status: 'Pending',
      deliveryType: 'Delivery',
      address: {
        manual: manualOrder.address
      },
      paymentMethod: 'COD',
      pin,
      createdAt: Date.now()
    };

    try {
      await addDoc(collection(db, 'orders'), newOrder);
      alert(`Order created successfully! PIN: ${pin}`);
      setIsCreatingOrder(false);
      setManualOrder({ customerName: '', phone: '', address: '', items: [] });
    } catch (e) {
      console.error("Manual order creation failed", e);
      alert("Failed to create order.");
    }
  };

  const handleCleanupOldOrders = async () => {
    const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
    const oldOrders = orders.filter(o => o.createdAt < sixMonthsAgo);
    
    if (oldOrders.length === 0) {
      alert("No orders older than 6 months found.");
      return;
    }

    if (!window.confirm(`Warning: You are about to permanently delete ${oldOrders.length} orders older than 6 months. This action follows your updated T&C. Continue?`)) return;

    setIsCleaningUp(true);
    try {
      await Promise.all(oldOrders.map(o => deleteDoc(doc(db, 'orders', o.id))));
      alert(`Successfully removed ${oldOrders.length} old orders.`);
    } catch (e) {
      console.error("Cleanup failed", e);
      alert("Cleanup failed. Check console.");
    } finally {
      setIsCleaningUp(false);
    }
  };
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;
    try {
      await updateDoc(doc(db, 'orders', editingOrder.id), {
        items: editingOrder.items,
        total: editingOrder.total,
        address: editingOrder.address,
        deliveryType: editingOrder.deliveryType,
        deliverySlot: editingOrder.deliverySlot || null,
        paymentMethod: editingOrder.paymentMethod || null,
        status: editingOrder.status
      });
      setIsEditing(false);
      setEditingOrder(null);
      setSelectedOrder(null);
      alert('Order updated successfully!');
    } catch (e) {
      console.error("Order update failed", e);
      alert('Failed to update order. Check permissions.');
    }
  };

  const handleVerifyPin = () => {
    if (selectedOrder && pinInput === selectedOrder.pin) {
      if (onDeliveredWithPayment) {
        setPaymentOrder(selectedOrder);
        setReceivedAmount(selectedOrder.total);
        setIsCollectingPayment(true);
      } else {
        onUpdateStatus(selectedOrder.id, 'Delivered');
      }
      setSelectedOrder(null);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleConfirmDelivery = () => {
    if (!paymentOrder || !onDeliveredWithPayment) return;
    onDeliveredWithPayment(paymentOrder.id, receivedAmount);
    setIsCollectingPayment(false);
    setPaymentOrder(null);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map(o => o.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} orders?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'orders', id))));
      setSelectedIds([]);
    } catch (e) {
      console.error("Bulk delete failed", e);
    }
  };

  const handleBulkStatusUpdate = async (status: Order['status']) => {
    try {
      await Promise.all(selectedIds.map(id => updateDoc(doc(db, 'orders', id), { status })));
      setSelectedIds([]);
    } catch (e) {
      console.error("Bulk status update failed", e);
    }
  };

  const handlePrintInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice - ${order.id}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 58mm; 
              margin: 0; 
              padding: 5mm; 
              font-size: 10px;
              line-height: 1.2;
              color: #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .border-top { border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px; }
            .border-bottom { border-bottom: 1px dashed #000; margin-bottom: 5px; padding-bottom: 5px; }
            .flex { display: flex; justify-content: space-between; }
            .items-table { width: 100%; margin: 10px 0; }
            .items-table th { text-align: left; font-size: 8px; border-bottom: 1px solid #000; }
            .items-table td { padding: 2px 0; }
            .qr-placeholder { width: 40mm; height: 40mm; background: #eee; margin: 10px auto; display: flex; items-center; justify-content: center; font-size: 8px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">KALIKA STORE</div>
          <div class="center">Ranchi, Jharkhand</div>
          <div class="center">Ph: 6205284423</div>
          
          <div class="border-top border-bottom">
            <div class="flex"><span>Date:</span> <span>${new Date(order.createdAt).toLocaleDateString()}</span></div>
            <div class="flex"><span>Order:</span> <span>#${order.id.slice(-6).toUpperCase()}</span></div>
            <div class="flex"><span>Type:</span> <span>${order.deliveryType}</span></div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th style="text-align: right;">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td style="max-width: 30mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</td>
                  <td>${item.quantity}</td>
                  <td style="text-align: right;">${item.price * item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="border-top bold" style="font-size: 12px;">
            <div class="flex"><span>TOTAL:</span> <span>₹${order.total}</span></div>
          </div>
          
          <div class="center border-top" style="margin-top: 10px;">
            <div class="bold">Verification PIN: ${order.pin}</div>
            <p style="font-size: 8px;">Thank you for shopping!</p>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const connectBluetoothPrinter = async () => {
    if (!navigator.bluetooth) {
      alert('Bluetooth is not supported in this browser. Please use Chrome or Edge on a supported device.');
      return;
    }

    try {
      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // Standard ESC/POS service
      });
      
      if (device) {
        console.log('Connected to:', device.name);
        alert(`Connected to ${device.name}. You can now print directly.`);
      }
    } catch (e: any) {
      // Handle cancellation gracefully
      if (e.name === 'NotFoundError' || e.message.includes('User cancelled')) {
        console.log('Bluetooth pairing cancelled by user');
        return;
      }
      
      console.error('Bluetooth connection failed:', e);
      alert('Bluetooth printer connection failed. Please ensure your printer is in pairing mode and Bluetooth is enabled.');
    }
  };

  const handleVerifyAddress = async (order: Order) => {
    if (!order.address) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        'address.verified': true
      });
      alert('Address marked as verified!');
    } catch (e) {
      console.error("Address verification failed", e);
    }
  };

  const handleCreateBill = () => {
    window.open('/bill', '_blank');
  };

  const filteredOrders = orders.filter(o => {
    const queryStr = search.toLowerCase();
    const itemMatch = o.items.some(item => item.name.toLowerCase().includes(queryStr));
    const userMatch = (o.userName || '').toLowerCase().includes(queryStr) || 
                     (o.userPhone || '').includes(queryStr);
    
    const matchesSearch = o.id.toLowerCase().includes(queryStr) || 
                         o.userId.toLowerCase().includes(queryStr) ||
                         itemMatch || userMatch;

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    
    let matchesDate = true;
    const now = Date.now();
    if (dateFilter === 'today') {
      const startOfDay = new Date().setHours(0,0,0,0);
      matchesDate = o.createdAt >= startOfDay;
    } else if (dateFilter === 'week') {
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
      matchesDate = o.createdAt >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = now - (30 * 24 * 60 * 60 * 1000);
      matchesDate = o.createdAt >= monthAgo;
    }

    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => b.createdAt - a.createdAt);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'Order Received': return 'bg-cyan-100 text-cyan-600 border-cyan-200';
      case 'Packaging': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Packed': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'Out for Delivery': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'Ready to Pick Up': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'Delivered': return 'bg-green-100 text-green-600 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-600 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return Clock;
      case 'Order Received': return ShoppingBag;
      case 'Packaging': return Clock;
      case 'Packed': return Package;
      case 'Out for Delivery': return Truck;
      case 'Ready to Pick Up': return MapPin;
      case 'Delivered': return CheckCircle;
      case 'Cancelled': return XCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Orders', value: orders.length, icon: Package, color: 'primary', filter: 'all' },
          { label: 'Pending', value: orders.filter(o => o.status === 'Pending').length, icon: Clock, color: 'orange', filter: 'Pending' },
          { label: 'Delivered', value: orders.filter(o => o.status === 'Delivered').length, icon: CheckCircle, color: 'green', filter: 'Delivered' },
          { label: 'Revenue', value: `₹${orders.reduce((sum, o) => sum + o.total, 0)}`, icon: ArrowUpRight, color: 'blue', filter: 'all' },
        ].map((stat, i) => (
          <button 
            key={stat.label} 
            onClick={() => setStatusFilter(stat.filter)}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm text-left hover:shadow-md transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${stat.color === 'primary' ? 'primary' : stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color === 'primary' ? 'primary' : stat.color}-500`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</h4>
          </button>
        ))}
        <button 
          onClick={handleCleanupOldOrders}
          disabled={isCleaningUp}
          className="bg-red-50 p-6 rounded-[32px] border border-red-100 shadow-sm text-left hover:bg-red-600 group transition-all active:scale-95 disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-white/20 group-hover:text-white transition-colors">
              {isCleaningUp ? <Clock className="w-6 h-6 animate-spin" /> : <Trash2 className="w-6 h-6" />}
            </div>
          </div>
          <p className="text-xs font-black text-red-400 group-hover:text-white/60 uppercase tracking-widest mb-1">Data Retention</p>
          <h4 className="text-xl font-black text-red-900 group-hover:text-white tracking-tight">Cleanup Old Orders</h4>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 relative">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID or User ID..."
            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'today', 'week', 'month'].map((df) => (
            <button
              key={df}
              onClick={() => setDateFilter(df as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                dateFilter === df ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {df}
            </button>
          ))}
          <div className="w-px h-8 bg-gray-100 mx-2" />
          {['all', 'Pending', 'Order Received', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                statusFilter === status ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {status}
            </button>
          ))}
          <button 
            onClick={handleCreateBill}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <Printer className="w-4 h-4" />
            Create Bill
          </button>
          <button 
            onClick={connectBluetoothPrinter}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95"
          >
            <Bluetooth className="w-4 h-4" />
            Connect Printer
          </button>
          <button 
            onClick={() => setIsCreatingOrder(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-600/20"
          >
            <Plus className="w-4 h-4" />
            Manual Order
          </button>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-20 left-0 right-0 bg-gray-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl z-[60]"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-black uppercase tracking-widest">{selectedIds.length} selected</span>
                <div className="h-4 w-px bg-white/20" />
                <div className="flex items-center gap-2">
                  {['Pending', 'Order Received', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleBulkStatusUpdate(s as Order['status'])}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 w-10">
                  <button onClick={toggleSelectAll} className="p-1 text-gray-400 hover:text-primary transition-colors">
                    {selectedIds.length === filteredOrders.length ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                  </button>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Info</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);
                const isSelected = selectedIds.includes(order.id);
                return (
                  <tr key={order.id} className={`hover:bg-gray-50/50 transition-colors group ${isSelected ? 'bg-primary/5' : ''}`}>
                    <td className="px-8 py-6">
                      <button onClick={() => toggleSelect(order.id)} className={`p-1 transition-colors ${isSelected ? 'text-primary' : 'text-gray-300'}`}>
                        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 relative">
                          <Package className="w-5 h-5" />
                          {order.inBag && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center">
                              <ShoppingBag className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">#{order.id.slice(-8).toUpperCase()}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          {order.inBag && (
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/5 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                              Packed in Bag
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-gray-900">{order.userId.slice(0, 12)}...</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-400 font-medium">{order.deliveryType}</p>
                        {order.address?.verified && (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <div className="relative group/status">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                            <StatusIcon className="w-3 h-3" />
                            {order.status}
                          </span>
                        </div>
                        {/* Sequential Actions */}
                        <div className="flex gap-1 flex-wrap">
                          {order.status === 'Pending' && (
                            <button 
                              onClick={() => onUpdateStatus(order.id, 'Order Received')}
                              className="px-2 py-1 bg-cyan-50 text-cyan-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-cyan-600 hover:text-white transition-all active:scale-95 border border-cyan-100"
                            >
                              Receive
                            </button>
                          )}
                          {order.status === 'Order Received' && (
                            <button 
                              onClick={() => onUpdateStatus(order.id, 'Packaging')}
                              className="px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all active:scale-95 border border-orange-100"
                            >
                              Start Packaging
                            </button>
                          )}
                          {order.status === 'Packaging' && (
                            <button 
                              onClick={() => onUpdateStatus(order.id, 'Packed')}
                              className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all active:scale-95 border border-purple-100"
                            >
                              Mark Packed
                            </button>
                          )}
                          {order.status === 'Packed' && (
                            <button 
                              onClick={() => onUpdateStatus(order.id, order.deliveryType === 'Takeaway' ? 'Ready to Pick Up' : 'Out for Delivery')}
                              className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95 border border-blue-100"
                            >
                              {order.deliveryType === 'Takeaway' ? 'Ready for Pickup' : 'Dispatch'}
                            </button>
                          )}
                          {(order.status === 'Out for Delivery' || order.status === 'Ready to Pick Up') && (
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all active:scale-95 border border-green-100"
                            >
                              Verify PIN
                            </button>
                          )}
                          {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                            <button 
                              onClick={() => {
                                const reason = window.prompt("Reason for cancellation:");
                                if (reason) {
                                  onUpdateStatus(order.id, 'Cancelled');
                                  // In a real app we'd save the reason too
                                }
                              }}
                              className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 border border-red-100"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-black text-primary tracking-tighter">₹{order.total}</p>
                      <div className="flex flex-col">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.items.length} Items</p>
                        <p className="text-[9px] text-gray-400 line-clamp-1 max-w-[150px]">
                          {order.items.map(i => i.name).join(', ')}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all active:scale-95"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-300 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all active:scale-95">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggestions Section */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Future Suggestions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Inventory Management', desc: 'Auto-track stock levels and hide out-of-stock items.' },
            { title: 'Loyalty Program', desc: 'Reward points for every purchase to increase retention.' },
            { title: 'Voice Search', desc: 'Allow customers to find items using voice commands.' },
            { title: 'Delivery Tracking', desc: 'Real-time map tracking for delivery partners.' },
            { title: 'Multi-Language', desc: 'Support for Hindi and other local languages.' },
            { title: 'Subscriptions', desc: 'Weekly/Monthly grocery subscriptions for essentials.' }
          ].map((s) => (
            <div key={s.title} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
              <p className="text-sm font-black text-gray-900">{s.title}</p>
              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-gray-900 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Order Details</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#{selectedOrder.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setEditingOrder({...selectedOrder});
                      setIsEditing(true);
                    }}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white active:scale-95"
                    title="Edit Order"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors active:scale-95">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {selectedOrder.status === 'Cancelled' && selectedOrder.cancellationReason && (
                   <div className="p-6 bg-red-50 rounded-3xl border border-red-100 mb-4">
                     <div className="flex items-center gap-3 mb-2">
                       <AlertCircle className="w-5 h-5 text-red-500" />
                       <h4 className="text-xs font-black text-red-600 uppercase tracking-widest">Cancellation Reason</h4>
                     </div>
                     <p className="text-sm font-medium text-red-700 italic">"{selectedOrder.cancellationReason}"</p>
                   </div>
                )}
                {isEditing && editingOrder ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                         <h4 className="text-xs font-black text-primary uppercase tracking-widest">Edit Delivery Info</h4>
                         <div className="space-y-4">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Delivery Type</label>
                             <select 
                               value={editingOrder.deliveryType}
                               onChange={(e) => setEditingOrder(prev => prev ? {...prev, deliveryType: e.target.value as any} : null)}
                               className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold"
                             >
                               <option value="Delivery">Home Delivery</option>
                               <option value="Pickup">Store Pickup</option>
                             </select>
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Manual Address</label>
                             <textarea 
                               value={editingOrder.address?.manual || ''}
                               onChange={(e) => setEditingOrder(prev => prev ? {
                                 ...prev, 
                                 address: { ...prev.address!, manual: e.target.value }
                               } : null)}
                               className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium min-h-[80px] resize-none"
                             />
                           </div>
                         </div>
                       </div>
                       <div className="space-y-4">
                         <h4 className="text-xs font-black text-primary uppercase tracking-widest">Order Status</h4>
                         <select 
                           value={editingOrder.status}
                           onChange={(e) => setEditingOrder(prev => prev ? {...prev, status: e.target.value as any} : null)}
                           className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold"
                         >
                           {['Pending', 'Order Received', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'].map(s => (
                             <option key={s} value={s}>{s}</option>
                           ))}
                         </select>
                       </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest">Edit Items</h4>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Manual Total Overide</span>
                          <input 
                            type="number"
                            value={editingOrder.total}
                            onChange={(e) => setEditingOrder(prev => prev ? {...prev, total: parseInt(e.target.value) || 0} : null)}
                            className="w-24 bg-gray-50 border-none rounded-xl px-3 py-1.5 text-sm font-black text-right mt-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        {editingOrder.items.map((item, idx) => (
                          <div key={`edit-item-${idx}`} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-xl bg-white overflow-hidden shadow-sm">
                                {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <input 
                                    type="number" 
                                    value={item.price}
                                    onChange={(e) => {
                                      const newItems = [...editingOrder.items];
                                      newItems[idx] = { ...item, price: parseInt(e.target.value) || 0 };
                                      setEditingOrder(prev => prev ? {...prev, items: newItems} : null);
                                    }}
                                    className="w-16 bg-white border-none rounded-lg px-2 py-1 text-[10px] font-black"
                                  />
                                  <span className="text-[10px] text-gray-400">/ {item.selectedUnit}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center bg-white rounded-xl p-1 gap-2 border border-gray-100">
                                <button 
                                  onClick={() => {
                                    const newItems = [...editingOrder.items];
                                    newItems[idx] = { ...item, quantity: Math.max(1, item.quantity - 1) };
                                    setEditingOrder(prev => prev ? {...prev, items: newItems} : null);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 rounded-lg text-gray-400 active:scale-95"
                                >
                                  -
                                </button>
                                <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                <button 
                                  onClick={() => {
                                    const newItems = [...editingOrder.items];
                                    newItems[idx] = { ...item, quantity: item.quantity + 1 };
                                    setEditingOrder(prev => prev ? {...prev, items: newItems} : null);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 rounded-lg text-gray-400 active:scale-95"
                                >
                                  +
                                </button>
                              </div>
                              <button 
                                onClick={() => {
                                  const newItems = editingOrder.items.filter((_, i) => i !== idx);
                                  setEditingOrder(prev => prev ? {...prev, items: newItems} : null);
                                }}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Customer Info</h4>
                        <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                          <p className="text-sm font-bold text-gray-900">User ID: {selectedOrder.userId}</p>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                              selectedOrder.deliveryType === 'Delivery' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                            }`}>
                              {selectedOrder.deliveryType}
                            </span>
                            {selectedOrder.deliverySlot && (
                              <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest">
                                {selectedOrder.deliverySlot}
                              </span>
                            )}
                          </div>
                          {selectedOrder.status === 'Cancelled' && selectedOrder.cancellationReason && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Cancellation Reason</p>
                              <p className="text-xs text-red-700 font-bold">{selectedOrder.cancellationReason}</p>
                            </div>
                          )}
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Payment: {selectedOrder.paymentMethod}
                          </p>
                          {selectedOrder.address && (
                            <div className="space-y-3">
                              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Manual Address</p>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.address.manual || '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-gray-700 font-medium hover:text-primary transition-colors block leading-relaxed"
                                >
                                  {selectedOrder.address.manual || 'No address provided'}
                                </a>
                              </div>

                              {selectedOrder.address.liveLocationUrl && (
                                <a 
                                  href={selectedOrder.address.liveLocationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 bg-primary/10 p-3 rounded-xl border border-primary/20 group/loc transition-all hover:bg-primary/20"
                                >
                                  <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 group-hover/loc:scale-110 transition-transform">
                                    <Navigation className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Live Location Detected</p>
                                    <p className="text-[9px] font-bold text-primary/60 uppercase tracking-tighter">Click for exact marker on map</p>
                                  </div>
                                  <ArrowUpRight className="w-4 h-4 text-primary ml-auto group-hover/loc:translate-x-1 group-hover/loc:-translate-y-1 transition-transform" />
                                </a>
                              )}

                              <div className="flex items-center justify-between pt-1">
                                {!selectedOrder.address.verified ? (
                                  <button 
                                    onClick={() => handleVerifyAddress(selectedOrder)}
                                    className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline active:scale-95"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    Verify Address
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2 text-[10px] font-black text-green-500 uppercase tracking-widest">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Address Verified
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order Verification</h4>
                        <div className="space-y-3">
                          <div className={`p-4 rounded-2xl border-2 transition-all ${pinError ? 'bg-red-50 border-red-200' : 'bg-primary/5 border-primary/20'}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <ShieldCheck className={`w-5 h-5 ${pinError ? 'text-red-500' : 'text-primary'}`} />
                              <span className={`text-xs font-bold uppercase tracking-widest ${pinError ? 'text-red-600' : 'text-primary'}`}>
                                {pinError ? 'Invalid PIN' : 'Verify Delivery PIN'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                maxLength={4}
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                placeholder="Enter 4-digit PIN"
                                className="flex-1 bg-white border-none rounded-xl px-4 py-2 text-center text-lg font-black tracking-[0.5em] focus:ring-2 focus:ring-primary/20"
                              />
                              <button 
                                onClick={handleVerifyPin}
                                className="bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-dark transition-all active:scale-95"
                              >
                                Verify
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium mt-2">Ask the customer for their unique 4-digit verification PIN.</p>
                          </div>

                          <button 
                            onClick={() => {
                              const msg = `Order ID: ${selectedOrder.id}%0APIN: ${selectedOrder.pin}%0AAddress: ${selectedOrder.address?.manual || 'N/A'}`;
                              window.open(`https://wa.me/?text=${msg}`, '_blank');
                            }}
                            className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            Send PIN & Address to WhatsApp
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order Items</h4>
                      <div className="space-y-3">
                        {selectedOrder.items.map((item, i) => (
                          <div key={`order-item-${selectedOrder.id}-${i}`} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-50 rounded-xl overflow-hidden">
                                {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium">Qty: {item.quantity} {item.selectedUnit || 'Piece'} x ₹{item.price}</p>
                              </div>
                            </div>
                            <span className="text-sm font-black text-gray-900">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Amount</span>
                  <span className="text-2xl font-black text-gray-900 tracking-tight">₹{isEditing ? editingOrder?.total : selectedOrder.total}</span>
                </div>
                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={() => {
                          setIsEditing(false);
                          setEditingOrder(null);
                        }}
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors active:scale-95"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleUpdateOrder}
                        className="bg-primary text-white px-8 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-bold flex items-center gap-2"
                      >
                        <Save className="w-5 h-5" />
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => setSelectedOrder(null)}
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors active:scale-95"
                      >
                        Close
                      </button>
                      <button 
                        onClick={() => handlePrintInvoice(selectedOrder)}
                        className="bg-gray-900 text-white px-8 py-3 rounded-2xl shadow-xl shadow-gray-900/20 hover:bg-black transition-all active:scale-95 font-bold flex items-center gap-2"
                      >
                        <FileText className="w-5 h-5" />
                        Print Invoice
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isCreatingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]"
            >
              {/* Left Column: Customer Details */}
              <div className="md:w-1/3 bg-gray-50 p-8 border-r border-gray-100 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Customer Info</h3>
                  <button onClick={() => setIsCreatingOrder(false)} className="md:hidden p-2 bg-white rounded-xl text-gray-400">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Customer Name</label>
                    <input 
                      type="text"
                      value={manualOrder.customerName}
                      onChange={(e) => setManualOrder(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="e.g. John Doe"
                      className="w-full bg-white border-none rounded-2xl px-4 py-3 text-sm font-bold shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Phone Number</label>
                    <input 
                      type="tel"
                      value={manualOrder.phone}
                      onChange={(e) => setManualOrder(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. 9608123427"
                      className="w-full bg-white border-none rounded-2xl px-4 py-3 text-sm font-bold shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Delivery Address</label>
                    <textarea 
                      value={manualOrder.address}
                      onChange={(e) => setManualOrder(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Full delivery address..."
                      className="w-full bg-white border-none rounded-2xl px-4 py-3 text-sm font-medium shadow-sm min-h-[100px] resize-none"
                    />
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Amount</p>
                    <p className="text-2xl font-black text-primary">₹{manualOrder.items.reduce((sum, i) => sum + i.price * i.quantity, 0)}</p>
                  </div>
                  <button 
                    onClick={handleCreateManualOrder}
                    className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-xs"
                  >
                    Place Order Now
                  </button>
                  <button 
                    onClick={() => setIsCreatingOrder(false)}
                    className="w-full mt-4 bg-white text-gray-400 font-bold py-3 rounded-2xl hover:text-red-500 transition-colors text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Right Column: Product Selection */}
              <div className="flex-1 p-8 overflow-y-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Select Products</h3>
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                      placeholder="Search inventory..."
                      className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2 text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Selected Items List */}
                {manualOrder.items.length > 0 && (
                  <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10 space-y-3">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Order Items ({manualOrder.items.length})</p>
                    {manualOrder.items.map((item, idx) => (
                      <div key={`manual-item-${idx}`} className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl shadow-sm border border-primary/5">
                        <div className="flex items-center gap-3">
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <p className="text-sm font-black text-gray-900">{item.name}</p>
                            <p className="text-[10px] font-bold text-gray-400">₹{item.price} x {item.quantity}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const newItems = [...manualOrder.items];
                              newItems[idx].quantity = Math.max(1, newItems[idx].quantity - 1);
                              setManualOrder(prev => ({ ...prev, items: newItems }));
                            }}
                            className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="text-xs font-black">{item.quantity}</span>
                          <button 
                            onClick={() => {
                              const newItems = [...manualOrder.items];
                              newItems[idx].quantity += 1;
                              setManualOrder(prev => ({ ...prev, items: newItems }));
                            }}
                            className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100"
                          >
                            +
                          </button>
                          <button 
                            onClick={() => {
                              const newItems = manualOrder.items.filter((_, i) => i !== idx);
                              setManualOrder(prev => ({ ...prev, items: newItems }));
                            }}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inventory Results */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {products
                    .filter(p => p.name.toLowerCase().includes(manualSearch.toLowerCase()))
                    .slice(0, 12)
                    .map(product => (
                      <button
                        key={product.id}
                        onClick={() => {
                          const existing = manualOrder.items.find(i => i.id === product.id);
                          if (existing) {
                            const newItems = manualOrder.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
                            setManualOrder(prev => ({ ...prev, items: newItems }));
                          } else {
                            setManualOrder(prev => ({
                              ...prev,
                              items: [...prev.items, { 
                                id: product.id, 
                                name: product.name, 
                                price: product.price, 
                                quantity: 1, 
                                image: product.image 
                              }]
                            }));
                          }
                        }}
                        className="bg-white p-4 rounded-3xl border border-gray-100 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all text-left flex flex-col gap-3 group"
                      >
                        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 relative">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Plus className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{product.name}</p>
                          <p className="text-xs font-black text-primary">₹{product.price}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Collection Modal */}
      <AnimatePresence>
        {isCollectingPayment && paymentOrder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-primary text-white">
                <h3 className="text-2xl font-black tracking-tight">Collect Payment</h3>
                <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Order Amount: ₹{paymentOrder.total}</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Amount Received (INR)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-5 text-2xl font-black text-gray-900 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      autoFocus
                    />
                    <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                  </div>
                  
                  {receivedAmount < paymentOrder.total && (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-xs font-black text-orange-900">Reduced Payment Detected</p>
                        <p className="text-[10px] font-medium text-orange-700 uppercase tracking-widest">₹{paymentOrder.total - receivedAmount} will be added to Customer Dues.</p>
                      </div>
                    </div>
                  )}
                  {receivedAmount > paymentOrder.total && (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-xs font-black text-green-900">Extra Payment Detected</p>
                        <p className="text-[10px] font-medium text-green-700 uppercase tracking-widest">₹{receivedAmount - paymentOrder.total} will be added to Customer Wallet.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={handleConfirmDelivery}
                    className="w-full bg-primary text-white font-black py-5 rounded-3xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-xs"
                  >
                    Confirm Delivery & Payment
                  </button>
                  <button 
                    onClick={() => {
                      setIsCollectingPayment(false);
                      setPaymentOrder(null);
                    }}
                    className="w-full bg-gray-50 text-gray-400 font-black py-4 rounded-3xl hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
