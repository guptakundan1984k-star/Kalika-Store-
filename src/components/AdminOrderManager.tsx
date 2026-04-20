import React, { useState } from 'react';
import { 
  Search, Filter, Eye, CheckCircle, Truck, Package, Clock, 
  ShieldCheck, XCircle, MoreVertical, ArrowUpRight, ArrowDownRight, Calendar,
  Trash2, FileText, Download, CheckSquare, Square, Bluetooth, Printer, Sparkles,
  MapPin, CheckCircle2, ShoppingBag, Navigation
} from 'lucide-react';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db, doc, deleteDoc, updateDoc } from '../firebase';

interface AdminOrderManagerProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
}

export const AdminOrderManager: React.FC<AdminOrderManagerProps> = ({ orders, onUpdateStatus }) => {
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleVerifyPin = () => {
    if (selectedOrder && pinInput === selectedOrder.pin) {
      onUpdateStatus(selectedOrder.id, 'Delivered');
      setSelectedOrder(null);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
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
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || 
                         o.userId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.createdAt - a.createdAt);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Proceeded': return 'bg-cyan-100 text-cyan-600 border-cyan-200';
      case 'Packed': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'Out for Delivery': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'Delivered': return 'bg-green-100 text-green-600 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-600 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return Clock;
      case 'Proceeded': return CheckCircle;
      case 'Packed': return Package;
      case 'Out for Delivery': return Truck;
      case 'Delivered': return CheckCircle;
      case 'Cancelled': return XCircle;
      default: return Clock;
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
          {['all', 'Pending', 'Proceeded', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                statusFilter === status ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {status}
            </button>
          ))}
          <button 
            onClick={handleCreateBill}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            <Printer className="w-4 h-4" />
            Create Bill
          </button>
          <button 
            onClick={connectBluetoothPrinter}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
          >
            <Bluetooth className="w-4 h-4" />
            Connect Printer
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
                  {['Pending', 'Proceeded', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleBulkStatusUpdate(s as Order['status'])}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
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
                          <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden hidden group-hover/status:block z-50">
                            {['Pending', 'Proceeded', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'].map((s) => (
                              <button
                                key={s}
                                onClick={() => onUpdateStatus(order.id, s as Order['status'])}
                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all text-gray-400 hover:bg-primary/5 hover:text-primary"
                              >
                                Mark as {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Quick Actions for Proceed & Pack */}
                        <div className="flex gap-1">
                          {order.status === 'Pending' && (
                            <button 
                              onClick={() => onUpdateStatus(order.id, 'Proceeded')}
                              className="px-2 py-1 bg-cyan-50 text-cyan-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-cyan-600 hover:text-white transition-all"
                            >
                              Proceed
                            </button>
                          )}
                          {(order.status === 'Pending' || order.status === 'Proceeded') && (
                            <button 
                              onClick={() => onUpdateStatus(order.id, 'Packed')}
                              className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                            >
                              Pack
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
                          className="p-2 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-300 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
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
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
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
                      {selectedOrder.paymentMethod && (
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Payment: {selectedOrder.paymentMethod}
                        </p>
                      )}
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
                                className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
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
                            <p className="text-[10px] text-gray-400 font-medium">Qty: {item.quantity} x ₹{item.price}</p>
                          </div>
                        </div>
                        <span className="text-sm font-black text-gray-900">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Amount</span>
                  <span className="text-2xl font-black text-gray-900 tracking-tight">₹{selectedOrder.total}</span>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
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
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
