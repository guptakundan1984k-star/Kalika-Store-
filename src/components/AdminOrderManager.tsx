import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Eye, CheckCircle, Truck, Package, Clock, 
  ShieldCheck, XCircle, MoreVertical, ArrowUpRight, ArrowDownRight, Calendar,
  Trash2, FileText, Download, CheckSquare, Square, Bluetooth, Printer, Sparkles, Edit2, Save,
  MapPin, CheckCircle2, ShoppingBag, Navigation, Plus, Minus, AlertCircle, IndianRupee, Star,
  User, ArrowRight, Zap
} from 'lucide-react';
import { Order, Product, UserProfile } from '../types';
import { ProductImage } from './ProductImage';
import { motion, AnimatePresence } from 'motion/react';
import { db, doc, deleteDoc, updateDoc, collection, addDoc, onSnapshot } from '../firebase';
import { printerService } from '../services/BluetoothPrinterService';
import { InvoiceGenerator } from './InvoiceGenerator';


interface AdminOrderManagerProps {
  orders: Order[];
  products: Product[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onDeliveredWithPayment?: (id: string, receivedAmount: number) => void;
  defaultView?: 'table' | 'workflow';
  preSelectedCustomer?: UserProfile | null;
  onClearPreSelectedCustomer?: () => void;
  currentAdmin?: UserProfile | null;
}

export const AdminOrderManager: React.FC<AdminOrderManagerProps> = ({ 
  orders, 
  products, 
  onUpdateStatus, 
  onDeliveredWithPayment,
  defaultView = 'table',
  preSelectedCustomer,
  onClearPreSelectedCustomer,
  currentAdmin
}) => {
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const handleBack = () => {
      if (selectedOrder) {
        setSelectedOrder(null);
      }
    };
    window.addEventListener('cs-back-action', handleBack);
    return () => window.removeEventListener('cs-back-action', handleBack);
  }, [selectedOrder]);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(() => printerService.isConnected());
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [customerProfile, setCustomerProfile] = useState<UserProfile | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);

  useEffect(() => {
    if (paymentOrder && paymentOrder.userId && !paymentOrder.userId.startsWith('manual-')) {
      const unsub = onSnapshot(doc(db, 'users', paymentOrder.userId), (snap) => {
        if (snap.exists()) setCustomerProfile(snap.data() as UserProfile);
      });
      return () => unsub();
    } else {
      setCustomerProfile(null);
    }
  }, [paymentOrder]);

  useEffect(() => {
    if (paymentOrder) {
      setReceivedAmount(paymentOrder.total);
    }
  }, [paymentOrder]);
  const [isRating, setIsRating] = useState(false);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'table' | 'workflow'>(defaultView);
  const [csComment, setCsComment] = useState('');
  const [isProcessingDelivery, setIsProcessingDelivery] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  useEffect(() => {
    if (preSelectedCustomer) {
      setManualOrder({
        customerName: preSelectedCustomer.name || '',
        phone: (preSelectedCustomer.phone || '').replace('+91', ''),
        address: preSelectedCustomer.address || '',
        items: []
      });
      setIsCreatingOrder(true);
      onClearPreSelectedCustomer?.();
    }
  }, [preSelectedCustomer, onClearPreSelectedCustomer]);

  const handleCreateManualOrder = async () => {
    if (!manualOrder.customerName || !manualOrder.phone || !manualOrder.address || manualOrder.items.length === 0) {
      alert("Please fill all customer details and add at least one item.");
      return;
    }

    const total = manualOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder: Order = {
      id: "MAN" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase(),
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
      createdAt: Date.now(),
      placedBy: 'Store',
      adminName: currentAdmin?.name || 'Admin',
      adminPhone: currentAdmin?.phone || ''
    };

    try {
      await addDoc(collection(db, 'orders'), newOrder);
      
      // WhatsApp Redirect for store orders
      const itemsMsg = manualOrder.items.map(i => `• ${i.name} x${i.quantity}`).join('%0A');
      const dateStr = new Date(newOrder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = new Date(newOrder.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      
      const waMsg = `🏢 *STORE ORDER PLACED BY ADMIN*%0A%0A` +
                   `*Order:* #${newOrder.id.slice(-6).toUpperCase()}%0A` +
                   `*Staff (CS):* ${newOrder.adminName}%0A` +
                   `*Staff Phone:* ${newOrder.adminPhone}%0A` +
                   `*Customer:* ${newOrder.userName}%0A` +
                   `*Cust Phone:* ${newOrder.userPhone}%0A` +
                   `*Address:* ${newOrder.address?.manual}%0A` +
                   `*Date:* ${dateStr}%0A` +
                   `*Time:* ${timeStr}%0A` +
                   `*Slot:* Standard Delivery%0A%0A` +
                   `*Items:*%0A${itemsMsg}%0A%0A` +
                   `*Total:* ₹${newOrder.total}%0A` +
                   `*PIN:* ${pin}`;

      window.open(`https://wa.me/918002914323?text=${waMsg}`, '_blank');

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

  const handleVerifyPin = async () => {
    if (selectedOrder && pinInput === selectedOrder.pin) {
      const orderToDeliver = selectedOrder;
      setSelectedOrder(null);
      setPinInput('');
      setPinError(false);

      if (onDeliveredWithPayment) {
        setIsProcessingDelivery(true);
        try {
          // Automatically confirm delivery using the full order total
          await onDeliveredWithPayment(orderToDeliver.id, orderToDeliver.total);
          
          setShowSuccess(true);
          await new Promise(resolve => setTimeout(resolve, 1500));
          setShowSuccess(false);

          // Show rating modal after delivery
          setRatingOrder(orderToDeliver);
          setIsRating(true);
        } catch (e: any) {
          console.error("Delivery confirmation failed", e);
          alert(`Delivery failed: ${e.message || 'Unknown error'}`);
        } finally {
          setIsProcessingDelivery(false);
        }
      } else {
        // Fallback for status-only update
        onUpdateStatus(orderToDeliver.id, orderToDeliver.deliveryType === 'Takeaway' ? 'Picked Up' : 'Delivered');
        setRatingOrder(orderToDeliver);
        setIsRating(true);
      }
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!paymentOrder || !onDeliveredWithPayment || isProcessingDelivery) return;
    
    // Enforcement: if negative balance then no deselection allowed (must pay at least order total + debt)
    const debt = customerProfile && customerProfile.walletBalance && customerProfile.walletBalance < 0 ? Math.abs(customerProfile.walletBalance) : 0;
    const minAmountRequired = paymentOrder.total + (debt > 0 ? debt : 0);
    
    if (debt > 0 && receivedAmount < minAmountRequired) {
      alert(`Required: ₹${minAmountRequired.toFixed(2)} (Total ₹${paymentOrder.total} + Outstanding Debt ₹${debt.toFixed(2)}). You cannot deselect debt settlement.`);
      return;
    }
    
    if (receivedAmount < paymentOrder.total) {
      if (!window.confirm(`Received amount ₹${receivedAmount} is less than order total ₹${paymentOrder.total}. Balance will be added to customer's debt. Proceed?`)) return;
    }
    
    setIsProcessingDelivery(true);
    try {
      // Debt is NO DESELECTED - enforcing debt payment if it exists
      await onDeliveredWithPayment(paymentOrder.id, receivedAmount);
      
      setShowSuccess(true);
      // Wait 1.5s for success animation to be seen
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowSuccess(false);

      setIsCollectingPayment(false);
      // After payment, show rating modal
      setRatingOrder(paymentOrder);
      setIsRating(true);
      setPaymentOrder(null);
    } catch (e: any) {
      console.error("Delivery confirmation failed", e);
      alert(`Delivery confirmation failed: ${e.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsProcessingDelivery(false);
    }
  };

  const handleSubmitCSRatings = async () => {
    if (!ratingOrder) return;
    try {
      // Save reviews for each item
      const reviewPromises = ratingOrder.items.map(item => {
        const rating = itemRatings[item.id] || 5;
        return addDoc(collection(db, 'reviews'), {
          productId: item.id,
          userId: 'cs-staff',
          userName: 'CS Verified Staff',
          rating,
          comment: csComment || 'Delivered successfully with verified quality.',
          createdAt: Date.now(),
          isCSReview: true
        });
      });

      await Promise.all(reviewPromises);
      
      // Update order status if not already done
      if (ratingOrder.status !== 'Delivered' && ratingOrder.status !== 'Picked Up') {
        onUpdateStatus(ratingOrder.id, ratingOrder.deliveryType === 'Takeaway' ? 'Picked Up' : 'Delivered');
      }

      setIsRating(false);
      setRatingOrder(null);
      setItemRatings({});
      setCsComment('');
      alert('Delivery ratings submitted and items updated!');
    } catch (e) {
      console.error("CS Rating failed", e);
      alert('Failed to save ratings.');
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

    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const formattedTime = new Date(order.createdAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const invoiceHtml = `
      <html>
        <head>
          <title>Thermal Receipt - #${order.id.slice(-6).toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;850;950&family=JetBrains+Mono:wght@400;500;700;900&display=swap');
            @page { margin: 0; size: 58mm auto; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Inter', -apple-system, sans-serif; 
              width: 58mm; 
              margin: 0 auto; 
              padding: 4.5mm 3mm; 
              font-size: 9px;
              line-height: 1.35;
              color: #000;
              background-color: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: 700; }
            .mono { font-family: 'JetBrains Mono', monospace; }
            .divider { 
              border-top: 1px dashed #000; 
              margin: 5px 0; 
            }
            .double-divider { 
              border-top: 3px double #000; 
              margin: 5px 0; 
            }
            .brand-header {
              font-size: 14px;
              font-weight: 950;
              letter-spacing: -0.5px;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .brand-subtitle {
              font-size: 7.5px;
              text-transform: uppercase;
              font-weight: 600;
              letter-spacing: 0.5px;
              margin-bottom: 3px;
              opacity: 0.8;
            }
            .store-address {
              font-size: 7.5px;
              line-height: 1.2;
              opacity: 0.9;
            }
            .info-block {
              margin: 6px 0;
              font-size: 8px;
            }
            .flex-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 3.5px;
              align-items: flex-start;
            }
            .flex-row span:first-child {
              text-transform: uppercase;
              font-size: 7px;
              letter-spacing: 0.3px;
              font-weight: 500;
              color: #444;
            }
            .flex-row span:last-child {
              font-weight: 700;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 6px 0; 
            }
            .items-table th { 
              text-align: left; 
              font-size: 8px; 
              font-weight: bold;
              border-bottom: 1.5px solid #000; 
              padding-bottom: 3.5px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .items-table td { 
              padding: 4.5px 0; 
              vertical-align: top;
              font-size: 8px;
              border-bottom: 0.5px dashed #eee;
            }
            .item-title {
              font-weight: 700;
              text-transform: uppercase;
              font-size: 8.5px;
              line-height: 1.25;
            }
            .item-unit {
              font-size: 7px;
              color: #555;
              font-weight: 500;
              margin-top: 1px;
            }
            .item-price-each {
              font-size: 7px;
              color: #666;
              font-weight: 500;
              margin-top: 1.5px;
            }
            .pin-box {
              border: 1.5px dashed #000;
              border-radius: 6px;
              padding: 5px;
              margin: 8px 0;
              text-align: center;
              background: #fff;
            }
            .pin-title {
              font-size: 7px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 2px;
            }
            .pin-value {
              font-size: 15px;
              font-weight: 900;
              letter-spacing: 2px;
              font-family: 'JetBrains Mono', monospace;
            }
            .footer-msg {
              font-size: 7px;
              margin-top: 6px;
              line-height: 1.45;
              font-weight: 500;
              color: #444;
            }
            .payment-badge {
              border: 1px solid #000;
              padding: 2.5px 6px;
              font-size: 7px;
              font-weight: 800;
              display: inline-block;
              margin-top: 3px;
              letter-spacing: 0.5px;
              border-radius: 2px;
              text-transform: uppercase;
            }
            .barcode-style {
              font-family: 'JetBrains Mono', monospace;
              letter-spacing: 3px;
              font-size: 6.5px;
              font-weight: 900;
              margin: 10px 0 2px 0;
            }
          </style>
        </head>
        <body>
          <!-- Brand Logo Header -->
          <div class="center">
            <div class="brand-header">★ KALIKA STORE ★</div>
            <div class="brand-subtitle">Perfect Premium Quality</div>
            <div class="store-address">Opp. Krishi Bazaar, Ranchi, Jharkhand</div>
            <div class="store-address" style="font-weight: 700;">Mob/WA: +91 8002914323</div>
          </div>
          
          <div class="double-divider"></div>
          
          <!-- Metadata Info -->
          <div class="info-block">
            <div class="flex-row"><span>Receipt ID</span> <span class="bold mono">#${order.id.slice(-6).toUpperCase()}</span></div>
            <div class="flex-row"><span>Date/Time</span> <span class="mono">${formattedDate} | ${formattedTime}</span></div>
            <div class="flex-row"><span>Customer</span> <span class="bold">${order.userName || 'Guest Customer'}</span></div>
            <div class="flex-row"><span>Phone No</span> <span class="mono">${order.userPhone || 'N/A'}</span></div>
            <div class="flex-row"><span>Type</span> <span class="bold" style="text-transform: uppercase;">${order.deliveryType}</span></div>
            ${order.address?.manual ? `
              <div style="margin-top: 3.5px; padding-top: 3.5px; border-top: 0.5px dashed #ddd;">
                <p style="font-weight: 500; font-size: 6.5px; text-transform: uppercase; color: #555; margin-bottom: 1.5px;">Delivery Address</p>
                <p style="font-weight: 700; font-size: 7.5px; line-height: 1.25; word-break: break-word;">${order.address.manual}</p>
              </div>
            ` : ''}
          </div>

          <div class="divider"></div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 55%;">Particulars</th>
                <th style="width: 15%; text-align: center;">Qty</th>
                <th style="width: 30%; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>
                    <div class="item-title">${item.name}</div>
                    ${item.selectedUnit ? `<div class="item-unit">${item.selectedUnit}</div>` : ''}
                    <div class="item-price-each mono">₹${item.price} each</div>
                  </td>
                  <td class="center bold mono" style="font-size: 9.5px; vertical-align: middle;">${item.quantity}</td>
                  <td class="right bold mono" style="font-size: 9.5px; vertical-align: middle;">₹${(item.price * item.quantity).toFixed(0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="double-divider"></div>

          <!-- Total Calculation Information -->
          <div class="info-block">
            <div class="flex-row" style="font-size: 8px;">
              <span>Subtotal</span>
              <span class="mono">₹${order.total}</span>
            </div>
            <div class="flex-row" style="font-size: 8px;">
              <span>Delivery Fee</span>
              <span class="mono">₹0.00</span>
            </div>
            ${order.walletUsed ? `
              <div class="flex-row style="font-size: 8px;">
                <span>Wallet Credit</span>
                <span class="mono">-₹${order.walletUsed}</span>
              </div>
            ` : ''}
            <div class="flex-row bold" style="font-size: 11px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #000;">
              <span>Net Total</span>
              <span class="mono">₹${order.total}</span>
            </div>
          </div>

          <!-- Payment Badge -->
          <div class="center" style="margin-bottom: 4px;">
            <span class="payment-badge">
              PAY: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'CASH'}
            </span>
          </div>

          <div class="divider"></div>

          <!-- Delivery PIN Box -->
          <div class="pin-box">
            <div class="pin-title">Order Verification PIN</div>
            <div class="pin-value">${order.pin || 'N/A'}</div>
          </div>

          <!-- Verification barcode & message -->
          <div class="center barcode-style">||| |||| || ||| |*${order.id.slice(-6).toUpperCase()}*|</div>
          <div class="center footer-msg">
            <div class="bold">*** THANK YOU ***</div>
            <div>Please check items before leaving.</div>
            <div style="font-size: 6.5px; opacity: 0.6; margin-top: 3px; font-style: italic;">Computer Generated Receipt</div>
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
    try {
      await printerService.connect();
      setPrinterConnected(true);
      alert('Printer connected successfully!');
    } catch (e: any) {
      alert(e.message || 'Bluetooth connection failed');
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

  const filteredOrders = React.useMemo(() => {
    return orders.filter(o => {
      const queryStr = search.toLowerCase();
      const itemMatch = o.items.some(item => item.name.toLowerCase().includes(queryStr));
      const userMatch = (o.userName || '').toLowerCase().includes(queryStr) || 
                       (o.userPhone || '').includes(queryStr);
      
      const matchesSearch = o.id.toLowerCase().includes(queryStr) || 
                           o.userId.toLowerCase().includes(queryStr) ||
                           itemMatch || userMatch;

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter || (statusFilter === 'Store' && o.placedBy === 'Store');
      
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
  }, [orders, search, statusFilter, dateFilter]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'Order Received': return 'bg-cyan-100 text-cyan-600 border-cyan-200';
      case 'Packaging': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Packed': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'Out for Delivery': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'Ready to Pick Up': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'Picked Up': return 'bg-green-100 text-green-600 border-green-200';
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
      case 'Picked Up': return CheckCircle;
      case 'Delivered': return CheckCircle;
      case 'Cancelled': return XCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-0">

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orders.length, icon: Package, color: 'primary', filter: 'all' },
          { label: 'Pending', value: orders.filter(o => o.status === 'Pending').length, icon: Clock, color: 'orange', filter: 'Pending' },
          { label: 'Delivered', value: orders.filter(o => o.status === 'Delivered').length, icon: CheckCircle, color: 'green', filter: 'Delivered' },
          { label: 'Revenue', value: `₹${orders.reduce((sum, o) => sum + o.total, 0)}`, icon: ArrowUpRight, color: 'blue', filter: 'all' },
        ].map((stat, i) => (
          <button 
            key={stat.label} 
            onClick={() => setStatusFilter(stat.filter)}
            className="bg-white p-4 rounded-[48px] border border-gray-100 shadow-sm text-left hover:shadow-md transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 bg-${stat.color === 'primary' ? 'primary' : stat.color}-50 rounded-full flex items-center justify-center text-${stat.color === 'primary' ? 'primary' : stat.color}-500 shrink-0`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
            <h4 className="text-lg font-black text-gray-900 tracking-tight">{stat.value}</h4>
          </button>
        ))}
      </div>

      {/* Filters */}
          <div className="bg-white p-5 rounded-[2.5rem] border-2 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row gap-3 relative">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Orders..."
            className="w-full bg-gray-50 border-none rounded-full pl-10 pr-4 py-3 text-xs font-bold focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-full border border-gray-200">
            {['table', 'workflow'].map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m as any)}
                className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                  viewMode === m ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-full border border-gray-200">
            {['all', 'today', 'week', 'month'].map((df) => (
              <button
                key={df}
                onClick={() => setDateFilter(df as any)}
                className={`px-2.5 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                  dateFilter === df ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {df}
              </button>
            ))}
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-100 rounded-full px-4 py-2 text-[8px] font-black uppercase tracking-widest focus:ring-4 focus:ring-primary/5 outline-none cursor-pointer"
          >
            {['all', 'Store', 'Pending', 'Order Received', 'Packaging', 'Packed', 'Out for Delivery', 'Ready to Pick Up', 'Picked Up', 'Delivered', 'Cancelled'].map(s => (
              <option key={s} value={s}>{s === 'Store' ? '🛒 Store Orders' : s}</option>
            ))}
          </select>
          
          <div className="flex gap-1">
            <button 
              onClick={handleCreateBill}
              className="p-2 bg-primary text-white rounded-full hover:bg-black transition-all active:scale-95 shadow-lg shadow-primary/10"
              title="Create Bill"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={connectBluetoothPrinter}
              className={`p-2 rounded-full transition-all active:scale-95 shadow-lg ${
                printerConnected ? 'bg-green-500 text-white shadow-green-500/10' : 'bg-blue-500 text-white shadow-blue-500/10'
              }`}
              title={printerConnected ? 'Printer Connected' : 'Connect Printer'}
            >
              <Bluetooth className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsCreatingOrder(true)}
              className="p-2 bg-green-600 text-white rounded-full hover:bg-black transition-all active:scale-95 shadow-lg shadow-green-600/10"
              title="Manual Order"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute -top-16 left-0 right-0 bg-gray-900 text-white p-3 rounded-full flex items-center justify-between shadow-2xl z-[60]"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest pl-4">{selectedIds.length} selected</span>
                <div className="h-4 w-px bg-white/20" />
                <div className="flex items-center gap-1">
                  {['Pending', 'Delivered', 'Cancelled'].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleBulkStatusUpdate(s as Order['status'])}
                      className="px-3 py-1 bg-white/10 hover:bg-primary rounded-full text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleBulkDelete}
                className="bg-red-500 hover:bg-red-600 p-2 rounded-full transition-all active:scale-95 mr-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Orders View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-[48px] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 w-10">
                    <button onClick={toggleSelectAll} className="p-1 text-gray-400 hover:text-primary transition-colors">
                      {selectedIds.length === filteredOrders.length ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-[8px] font-black text-gray-400 uppercase tracking-widest">Order Info</th>
                  <th className="px-6 py-4 text-[8px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-[8px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[8px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                  <th className="px-6 py-4 text-[8px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(() => {
                  const uniqueOrders = filteredOrders.filter((o, i, self) => i === self.findIndex(t => t.id === o.id));
                  return uniqueOrders.map((order) => {
                    const StatusIcon = getStatusIcon(order.status);
                    const isSelected = selectedIds.includes(order.id);
                    return (
                      <tr key={`order-row-${order.id}`} className={`hover:bg-gray-50 transition-colors group ${isSelected ? 'bg-primary/5' : ''}`}>
                        <td className="px-6 py-4">
                          <button onClick={() => toggleSelect(order.id)} className={`p-1 transition-colors ${isSelected ? 'text-primary' : 'text-gray-200'}`}>
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 relative shrink-0">
                              <Package className="w-4 h-4" />
                              {order.inBag && (
                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white rounded-full flex items-center justify-center border border-white">
                                  <ShoppingBag className="w-2 h-2" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900 leading-none">#{order.id.slice(-8).toUpperCase()}</p>
                              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{order.userName || 'Guest'}</p>
                          <div className="flex items-center gap-1">
                            <p className="text-[9px] text-gray-400 font-medium uppercase tracking-tighter">{order.deliveryType}</p>
                            {order.address?.verified && (
                              <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border w-fit ${getStatusColor(order.status)}`}>
                              <StatusIcon className="w-3 h-3" />
                              {order.status}
                            </span>
                            {/* Action Shortcuts */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {order.status === 'Pending' && (
                                <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'Order Received'); }} className="text-[7px] font-black bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded border border-cyan-100 hover:bg-cyan-600 hover:text-white transition-all uppercase">Receive</motion.button>
                              )}
                              {order.status === 'Order Received' && (
                                <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'Packed'); }} className="text-[7px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all uppercase">Pack</motion.button>
                              )}
                              {order.status === 'Packed' && (
                                <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, order.deliveryType === 'Takeaway' ? 'Ready to Pick Up' : 'Out for Delivery'); }} className="text-[7px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 hover:bg-blue-600 hover:text-white transition-all uppercase">{order.deliveryType === 'Takeaway' ? 'Ready' : 'Ship'}</motion.button>
                              )}
                              {(order.status === 'Out for Delivery' || order.status === 'Ready to Pick Up') && (
                                <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} className="text-[7px] font-black bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100 hover:bg-green-600 hover:text-white transition-all uppercase">Verify PIN</motion.button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-black text-primary tracking-tighter leading-none">₹{order.total}</p>
                          <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-1">{order.items.length} Items</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); printerService.isConnected() ? printerService.printOrder(order) : handlePrintInvoice(order); }}
                              className="p-1.5 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-full transition-all active:scale-95"
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                              className="p-1.5 text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all active:scale-95"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'New', status: 'Pending', icon: Clock, color: 'orange' },
            { title: 'Packing', status: 'Order Received', icon: Package, color: 'cyan' },
            { title: 'Dispatch', status: 'Packed', icon: Truck, color: 'blue' },
            { title: 'Delivery', status: 'Out for Delivery', icon: MapPin, color: 'green' }
          ].map(col => {
            const colOrders = filteredOrders.filter(o => o.status === col.status);
            return (
              <div key={col.status} className="space-y-4">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 bg-${col.color}-50 rounded-lg flex items-center justify-center text-${col.color}-500`}>
                      <col.icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{col.title} ({colOrders.length})</h3>
                  </div>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                  {colOrders.map(order => (
                    <motion.div 
                      layout
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-black text-gray-900 leading-none">#{order.id.slice(-6).toUpperCase()}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{new Date(order.createdAt).toLocaleTimeString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-primary leading-none">₹{order.total}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <User className="w-3 h-3 text-gray-300" />
                        <p className="text-[10px] font-bold text-gray-600 truncate">{order.userName || 'Guest'}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (order.status === 'Pending') {
                            onUpdateStatus(order.id, 'Order Received');
                            // Voice feedback as requested
                            try {
                              const utterance = new SpeechSynthesisUtterance("Order Received. Processing.");
                              window.speechSynthesis.speak(utterance);
                            } catch (e) {}
                          }
                          else if (order.status === 'Order Received') onUpdateStatus(order.id, 'Packed');
                          else if (order.status === 'Packed') {
                            onUpdateStatus(order.id, order.deliveryType === 'Delivery' ? 'Out for Delivery' : 'Ready to Pick Up');
                            
                            // WhatsApp Redirect as requested
                            const itemsMsg = order.items.map(i => `• ${i.name} x${i.quantity}${i.selectedUnit ? ` (${i.selectedUnit})` : ''}`).join('%0A');
                            const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                            const timeStr = new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                            
                            const waMsg = `📦 *${order.deliveryType === 'Delivery' ? 'ORDER DISPATCHED' : 'ORDER READY'}*%0A%0A` +
                                         `*Order:* #${order.id.slice(-6).toUpperCase()}%0A` +
                                         `*CS Name:* ${currentAdmin?.name || 'Kalika Support'}%0A` +
                                         `*Customer:* ${order.userName}%0A` +
                                         `*Contact:* ${order.userPhone || 'N/A'}%0A` +
                                         `*Address:* ${order.address?.manual || 'Store Pickup'}%0A` +
                                         `*Date:* ${dateStr}%0A` +
                                         `*Time:* ${timeStr}%0A` +
                                         `*Time Slot:* ${order.deliverySlot || 'Standard'}%0A%0A` +
                                         `*Items:*%0A${itemsMsg}%0A%0A` +
                                         `*Total:* ₹${order.total}%0A` +
                                         `*PIN:* ${order.pin}%0A%0A` +
                                         `_Thank you for choosing Kalika_`;

                            window.open(`https://wa.me/918002914323?text=${waMsg}`, '_blank');

                            // Voice feedback as requested
                            try {
                              const utterance = new SpeechSynthesisUtterance(order.deliveryType === 'Delivery' ? "Order Dispatched" : "Order Ready for Pickup");
                              window.speechSynthesis.speak(utterance);
                            } catch (e) {}
                          }
                          else if (order.status === 'Out for Delivery' || order.status === 'Ready to Pick Up') {
                            setSelectedOrder(order);
                          }
                        }}
                        className={`w-full py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                          (order.status === 'Out for Delivery' || order.status === 'Ready to Pick Up') ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                        }`}
                      >
                        {order.status === 'Pending' ? 'Receive' : 
                         order.status === 'Order Received' ? 'Pack' : 
                         order.status === 'Packed' ? (order.deliveryType === 'Delivery' ? 'Dispatch' : 'Ready') : 
                         (order.deliveryType === 'Delivery' ? 'Deliver' : 'Picked Up')}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                  {colOrders.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-300 grayscale opacity-40">
                      <col.icon className="w-8 h-8 mb-2" />
                      <p className="text-[8px] font-black uppercase tracking-widest">No {col.title} Orders</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            { title: 'AI Insights', desc: 'Predicted order volumes based on past sales data.' },
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
              className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[96vh]"
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
                                <ProductImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
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
                      <InvoiceGenerator order={selectedOrder} />
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
                          <img src={item.image || undefined} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
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
                          <img src={product.image || undefined} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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

      {/* Rating Modal */}
      <AnimatePresence>
        {isRating && ratingOrder && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-8 space-y-6 flex flex-col max-h-[90vh]"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-50 rounded-[28px] flex items-center justify-center text-blue-500 mx-auto">
                  <Star className="w-8 h-8 fill-current" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Staff Delivery Rating</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rate item quality for order #{ratingOrder.id.slice(-6).toUpperCase()}</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {ratingOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shadow-sm border border-gray-100 flex-shrink-0">
                        <ProductImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-900 truncate max-w-[150px]">{item.name}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{item.quantity} × {item.selectedUnit || 'unit'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                          key={star}
                          whileTap={{ scale: 1.25 }}
                          onClick={() => setItemRatings(prev => ({ ...prev, [item.id]: star }))}
                          className={`p-1 transition-all ${
                            (itemRatings[item.id] || 5) >= star ? 'text-yellow-400' : 'text-gray-200'
                          }`}
                        >
                          <Star className={`w-5 h-5 ${(itemRatings[item.id] || 5) >= star ? 'fill-current' : ''}`} />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">CS Internal Comment</label>
                  <textarea 
                    value={csComment}
                    onChange={(e) => setCsComment(e.target.value)}
                    placeholder="E.g. Quality verified, delivered by hand..."
                    className="w-full bg-gray-50 border-none rounded-3xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 min-h-[100px] outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-50">
                <button 
                  onClick={() => { setIsRating(false); setRatingOrder(null); onUpdateStatus(ratingOrder.id, 'Delivered'); }}
                  className="flex-1 py-5 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
                >
                  Skip
                </button>
                <button 
                  onClick={handleSubmitCSRatings}
                  className="flex-[2] py-5 bg-primary text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                >
                  Submit Feedback
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
