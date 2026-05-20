import React, { useState, useRef, useEffect } from 'react';
import { CartItem, UserProfile, Order, Coupon, StoreSettings } from '../types';
import { useStore } from '../contexts/StoreContext';
import { MapPin, Truck, ShoppingBag, CreditCard, ArrowRight, CheckCircle, ShieldCheck, Clock, XCircle, Navigation, Smartphone, Wallet, Banknote, Sparkles, AlertCircle, IndianRupee, FileText, ArrowLeft, RefreshCw, Home, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, updateDoc, db, addDoc, setDoc, collection, getDoc, getDocs, query, where, onSnapshot, handleFirestoreError, OperationType, increment } from '../firebase';
import { OrderProcessingScreen } from '../components/OrderProcessingScreen';
import { InvoiceGenerator } from '../components/InvoiceGenerator';
import { ProductImage } from '../components/ProductImage';
import { notificationService } from '../services/notificationService';


interface CheckoutProps {
  cart: CartItem[];
  user: UserProfile | null;
  coupons: Coupon[];
  onOrderPlaced: (order: Order) => void;
  storeSettings?: StoreSettings | null;
}

export const Checkout: React.FC<CheckoutProps> = ({ cart, user, coupons, onOrderPlaced, storeSettings }) => {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const orderType = (searchParams.get('type') || 'personal') as 'personal' | 'sell';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [deliveryType, setDeliveryType] = useState<'Takeaway' | 'Delivery'>('Delivery');
  const [manualAddress, setManualAddress] = useState(user?.address || '');
  const [deliverySlot, setDeliverySlot] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'WALLET'>('COD');
  const [liveLocation, setLiveLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isPlaced, setIsPlaced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [orderPin, setOrderPin] = useState('');
  const [inBag, setInBag] = useState(false);
  const [selectedDate, setSelectedDate] = useState(0); // 0: Today, 1: Tomorrow, etc.
  const [checkoutStep, setCheckoutStep] = useState<0 | 1>(0);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Swipe to order states
  const [swipeProgress, setSwipeProgress] = useState(0);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBack = () => {
      if (checkoutStep === 1) {
        setCheckoutStep(0);
      } else {
        navigate(-1);
      }
    };
    window.addEventListener('checkout-back-step', handleBack);
    return () => window.removeEventListener('checkout-back-step', handleBack);
  }, [checkoutStep, navigate]);

  const [inWalletStep, setInWalletStep] = useState(false); // To handle back button in payment
  const [useWallet, setUseWallet] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [phoneInput, setPhoneInput] = useState(user?.phone || '');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Auto-apply or suggest coupons (Premium feature)
  const suggestedCoupon = React.useMemo(() => {
    if (appliedCoupon) return null;
    
    // Find active, non-expired coupons that match cart eligibility and minOrder
    const viable = coupons.filter(c => {
      if (c.status !== 'active') return false;
      if (c.expiryDate && c.expiryDate < Date.now()) return false;
      if (c.minOrder && subtotal < c.minOrder) return false;
      return cart.some(item => c.eligibleProducts?.includes(item.id));
    });

    // Sort to suggest best discount (approximate)
    return viable.sort((a, b) => b.discount - a.discount)[0] || null;
  }, [coupons, cart, subtotal, appliedCoupon]);

  const addressRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  const { deliveryFee: configDeliveryFee, freeDeliveryThreshold: configThreshold, envStatus } = useStore();
  
  const walletBalance = user?.walletBalance || 0;
  const walletDue = walletBalance < 0 ? Math.abs(walletBalance) : 0;
  
  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    
    // User requested: "Discount should calculate only on subtotal of eligible matched products."
    const eligibleSubtotal = cart.reduce((sum, item) => {
      const isEligible = appliedCoupon.eligibleProducts?.includes(item.id);
      return isEligible ? sum + (item.price * item.quantity) : sum;
    }, 0);

    if (eligibleSubtotal === 0) return 0;

    let discount = 0;
    if (appliedCoupon.type === 'percentage') {
      discount = (eligibleSubtotal * appliedCoupon.discount) / 100;
      if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) {
        discount = appliedCoupon.maxDiscount;
      }
    } else {
      discount = Math.min(appliedCoupon.discount, eligibleSubtotal);
    }
    return discount;
  };

  const couponDiscount = calculateDiscount();
  const deliveryFee = deliveryType === 'Delivery' ? (subtotal >= configThreshold ? 0 : configDeliveryFee) : 0;
  
  // Wallet credit is only applied if useWallet is true AND balance is positive
  const walletCredit = (useWallet && walletBalance > 0) ? Math.min(walletBalance, subtotal + deliveryFee - couponDiscount) : 0;

  // Debt (walletDue) is ALWAYS added if balance is negative, because you can't "deselect" debt.
  const total = Math.max(0, subtotal + deliveryFee - couponDiscount - walletCredit + walletDue);

  const isEnvironmentClosed = envStatus?.status === 'closed';
  const isEnvironmentDelayed = envStatus?.status === 'delayed';

  const handleApplyCoupon = () => {
    setCouponError('');
    const found = coupons.find(c => c.code === couponCode.trim().toUpperCase());
    
    if (!found) {
      setCouponError('Invalid coupon code');
      setAppliedCoupon(null);
      return;
    }

    if (found.status === 'inactive') {
      setCouponError('This coupon is currently inactive.');
      setAppliedCoupon(null);
      return;
    }

    if (found.expiryDate && found.expiryDate < Date.now()) {
      setCouponError('Coupon has expired');
      setAppliedCoupon(null);
      return;
    }

    if (found.minOrder && subtotal < found.minOrder) {
      setCouponError(`Minimum order of ₹${found.minOrder} required`);
      setAppliedCoupon(null);
      return;
    }

    if (found.usageLimit && found.usedCount && found.usedCount >= found.usageLimit) {
      setCouponError('This coupon usage limit has been reached.');
      setAppliedCoupon(null);
      return;
    }

    // STRICT CUSTOMER VALIDATION RULE: cart contains at least one eligible linked product
    const hasEligibleItem = cart.some(item => found.eligibleProducts?.includes(item.id));
    if (!hasEligibleItem) {
      setCouponError("This item isn't eligible for this coupon.");
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(found);
    setCouponError('');
  };

  const availableDays = React.useMemo(() => {
    const days = [];
    const now = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      const day = date.getDay();
      
      // Default times to match user request (image shows 6:30 AM start)
      let openTime = storeSettings?.openingTime || "06:30";
      let closeTime = storeSettings?.closingTime || "21:00";
      
      if (day === 0) { // Sunday
        openTime = storeSettings?.sundayOpeningTime || "10:40";
        closeTime = storeSettings?.sundayClosingTime || "15:00";
      }
      
      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);

      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      
      const daySlots: string[] = [
        "10:00 AM - 11:00 AM",
        "11:00 AM - 12:00 PM",
        "01:00 PM - 02:00 PM",
        "04:00 PM - 05:00 PM",
        "05:00 PM - 06:00 PM",
        "06:00 PM - 07:00 PM",
        "07:00 PM - 08:00 PM"
      ];

      // Filter out past slots for today
      let filteredSlots = daySlots;
      if (i === 0) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        filteredSlots = daySlots.filter(slot => {
          const [time] = slot.split(' - ');
          let [hourStr, minuteStr] = time.split(':');
          let [minute, period] = minuteStr.split(' ');
          let hour = parseInt(hourStr);
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          
          const slotTime = hour * 60 + parseInt(minute);
          const currentTime = currentHour * 60 + currentMinute;
          return slotTime > currentTime + 30; // At least 30 mins in advance
        });
      }

      days.push({
        dayName,
        dateStr,
        slots: filteredSlots
      });
    }
    return days;
  }, [storeSettings]);

  // Auto-select next available day if today is exhausted
  useEffect(() => {
    if (availableDays.length > 0 && selectedDate === 0 && availableDays[0].slots.length === 0) {
      setSelectedDate(1);
    }
  }, [availableDays.length]); // Fix: only trigger when length changes

  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'store'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as StoreSettings);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (settings && settings.isDeliveryEnabled === false) {
      setDeliveryType('Takeaway');
    }
  }, [settings]);

  const handleGetLocation = () => {
    setIsLocating(true);
    setErrors(prev => ({ ...prev, address: '' }));
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Jharkhand bounding box check
          const isJharkhand = latitude >= 21.9 && latitude <= 25.3 && longitude >= 83.3 && longitude <= 88.0;
          
          if (!isJharkhand) {
            setErrors(prev => ({ ...prev, address: "Not detected Jharkhand address. We currently only deliver in Jharkhand." }));
            setIsLocating(false);
            return;
          }

          setLiveLocation({ lat: latitude, lng: longitude });

          try {
            // Priority: Google Maps Reverse Geocoding if API key exists
            const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            if (googleKey) {
              const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleKey}`);
              const data = await response.json();
              if (data.status === 'OK' && data.results.length > 0) {
                const address = data.results[0].formatted_address;
                setManualAddress(address);
                setIsLocating(false);
                return;
              }
            }

            // Fallback to OpenStreetMap (Nominatim)
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
            const data = await response.json();
            const address = data.display_name || `Jharkhand, Ranchi (Live Location: ${latitude}, ${longitude})`;
            setManualAddress(address);
          } catch (e) {
            const fallbackAddr = `Live Location: https://www.google.com/maps?q=${latitude},${longitude}`;
            setManualAddress(prev => prev ? `${prev}\n${fallbackAddr}` : fallbackAddr);
          }
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          let msg = "Could not get your location. Please enter address manually.";
          if (error.code === error.PERMISSION_DENIED) {
            msg = "LOCATION PERMISSION DENIED. Please allow location access in your browser settings to use this feature.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = "Location information is unavailable. Please check your GPS or signal.";
          } else if (error.code === error.TIMEOUT) {
            msg = "Location request timed out. Please try again or enter manually.";
          }
          setErrors(prev => ({ ...prev, address: msg }));
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setErrors(prev => ({ ...prev, address: "Geolocation is not supported by your browser." }));
      setIsLocating(false);
    }
  };

  const handleNextStep = () => {
    setErrors({});
    if (checkoutStep === 0) {
      if (deliveryType === 'Delivery' || deliveryType === 'Takeaway') {
        if (deliveryType === 'Delivery') {
          if (!manualAddress || manualAddress.length < 5) {
            setErrors(prev => ({ ...prev, address: "Please provide a valid address." }));
            addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
        if (!deliverySlot) {
          setErrors(prev => ({ ...prev, slot: `Please select a ${deliveryType === 'Delivery' ? 'delivery' : 'pickup'} slot.` }));
          slotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      if (!phoneInput || phoneInput.length < 10) {
        setErrors(prev => ({ ...prev, phone: "Phone number required for delivery." }));
        const phoneInputEl = document.getElementById('checkout-phone-input-field');
        if (phoneInputEl) {
          phoneInputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      
      // Sync phone if changed
      if (user && phoneInput !== user.phone) {
        updateDoc(doc(db, 'users', user.uid), { phone: phoneInput }).catch(err => console.error("Auto-sync phone failed", err));
      }

      setCheckoutStep(1); // Go straight to Review
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePlaceOrder = async () => {
    console.log("handlePlaceOrder invoked", { 
      isProcessing, 
      isPlaced, 
      isEnvironmentClosed, 
      deliveryType, 
      total 
    });

    if (isProcessing || isPlaced) {
      console.log("Order already processing or processed");
      return;
    }

    // Environmental Check
    if (isEnvironmentClosed) {
      console.error("Environment is closed", envStatus);
      alert(`Sorry, the store is closed for tomorrow's delivery due to: ${envStatus?.reason || 'Holiday'}. Please try again later.`);
      return;
    }

    if (isEnvironmentDelayed) {
      const confirmDelay = window.confirm(`Important: Delivery may be delayed due to ${envStatus?.reason || 'Current Weather'}. \n\nDo you want to proceed with the order?`);
      if (!confirmDelay) return;
    }

    // Check if it's a pre-order (Tomorrow or beyond)
    const isPreOrder = selectedDate > 0;

    if (storeSettings && !storeSettings.isFunctionallyOpen && !isPreOrder) {
      const proceedAsPreOrder = window.confirm(`${storeSettings.message || "Store is currently closed."}\n\nWould you like to place a PRE-ORDER for tomorrow instead?`);
      if (proceedAsPreOrder) {
        setSelectedDate(1);
        setTimeout(() => {
          slotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
      return;
    }

    if (!user) {
      alert("Please sign in to place an order.");
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      navigate('/');
      return;
    }

    if (deliveryType === 'Delivery') {
      if (storeSettings?.isDeliveryEnabled === false) {
        alert("Home delivery is currently unavailable. Please choose Self Pickup.");
        setDeliveryType('Takeaway');
        return;
      }
      if (!manualAddress || manualAddress.trim().length < 5) {
        setErrors(prev => ({ ...prev, address: "Please provide a complete delivery address." }));
        setCheckoutStep(0);
        setTimeout(() => {
          addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
    }

    if (!phoneInput || !/^\d{10,}$/.test(phoneInput.replace(/\s/g, ''))) {
      setErrors(prev => ({ ...prev, phone: "Valid phone number (min 10 digits) required." }));
      setCheckoutStep(0);
      return;
    }

    if (deliveryType === 'Delivery' && !deliverySlot) {
      setErrors(prev => ({ ...prev, slot: "Please select a delivery slot." }));
      setCheckoutStep(0);
      return;
    }

    setIsProcessing(true);

    try {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const generatedOrderId = `#${Math.floor(100000 + Math.random() * 899999)}`;
      const now = Date.now();
      const dateStrLong = new Date(now).toLocaleString('en-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric', 
        hour12: true 
      });
      
      const isAdmin = user?.role === 'admin' || user?.role === 'cs';
      
      const newOrder: Order = {
        id: generatedOrderId,
        userId: user.uid,
        userName: user.name || 'Customer',
        userPhone: phoneInput,
        items: cart,
        total,
        status: 'Pending',
        isPreOrder,
        deliveryType,
        address: deliveryType === 'Delivery' ? { manual: manualAddress } : { manual: 'Pickup at Store' },
        deliverySlot: deliverySlot || (deliveryType === 'Delivery' ? 'Standard' : 'Pickup at Store'),
        paymentMethod,
        orderType,
        pin,
        createdAt: now,
        timestamp: dateStrLong,
        placedBy: isAdmin ? 'Store' : 'User',
        adminName: isAdmin ? user.name : undefined,
        adminPhone: isAdmin ? user.phone : undefined
      } as any;

      const finalOrder = JSON.parse(JSON.stringify({
        ...newOrder,
        subtotal,
        deliveryFee,
        walletUsed: paymentMethod === 'WALLET' ? walletCredit : 0,
        walletDebtSettle: walletDue, // Track settled debt in the order
        updatedAt: now
      }));

      console.log("Saving order to Firestore:", finalOrder.id);
      await setDoc(doc(db, 'orders', finalOrder.id), finalOrder);
      
      if (paymentMethod === 'WALLET' && walletCredit > 0) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const currentBalance = userSnap.data()?.walletBalance || 0;
        const newBalance = currentBalance - walletCredit;
        
        await updateDoc(userRef, { walletBalance: newBalance });
        await addDoc(collection(db, 'walletTransactions'), {
          userId: user.uid,
          amount: -walletCredit,
          balanceAfter: newBalance,
          type: 'order_payment',
          description: `Paid for Order ${finalOrder.id}`,
          orderId: finalOrder.id,
          createdAt: now
        });
      }

      // Notify admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        title: '🛍️ New Order Received!',
        body: `Order ${finalOrder.id} from ${user.name} for ₹${total}`,
        orderId: finalOrder.id,
        type: 'order',
        createdAt: now,
        isRead: false
      });

      setOrderId(finalOrder.id);
      setOrderPin(pin);
      
      // Speed up: Call finalizeOrder immediately instead of waiting for processing screen
      finalizeOrder(finalOrder.id, pin);
      
    } catch (error: any) {
      console.error('Checkout error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'orders');
      alert(`Failed to place order: ${error.message || 'Server error'}. Please try again.`);
      setIsProcessing(false);
    }
  };

  const finalizeOrder = (oId?: string, oPin?: string) => {
    const finalId = oId || orderId;
    const finalPin = oPin || orderPin;

    setIsProcessing(false);
    setIsPlaced(true);
    
    // WhatsApp Redirect for Everyone
    const itemsMsg = cart.map(i => `• ${i.name} x ${i.quantity}${i.selectedUnit ? ` (${i.selectedUnit})` : ''}`).join('%0A');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    // Safety check for delivery date
    const deliveryDate = availableDays[selectedDate]?.dateStr || (selectedDate === 0 ? 'Today' : 'Upcoming');
    
    const isAdmin = user?.role === 'admin' || user?.role === 'cs';
    
    const csName = isAdmin ? (user?.name || 'Kalika Support') : 'Kalika Support';
    const csContact = isAdmin ? (user?.phone || '8002914323') : '8002914323';

    const waMsg = `🛍️ *${isAdmin ? 'STORE ORDER CONFIRMED' : 'NEW ORDER RECEIVED'}*%0A%0A` +
                 `*CS Name:* ${csName}%0A` +
                 `*CS Contact:* ${csContact}%0A` +
                 `*Customer:* ${user?.name || 'Customer'}%0A` +
                 `*Contact:* ${phoneInput || user?.phone || 'N/A'}%0A` +
                 `*Address:* ${deliveryType === 'Delivery' ? (manualAddress || 'Jharkhand') : 'Store Pickup (Ranchi)'}%0A%0A` +
                 `*Order ID:* #${finalId.slice(-6).toUpperCase()}%0A` +
                 `*Order PIN:* ${finalPin || '0000'}%0A` +
                 `*Order Date/Time:* ${dateStr} | ${timeStr}%0A` +
                 `*Date of Delivery:* ${deliveryDate}%0A` +
                 `*Time Slot:* ${deliverySlot || (deliveryType === 'Delivery' ? 'Standard' : 'Pickup')}%0A%0A` +
                 `*Items:*%0A${itemsMsg}%0A%0A` +
                 `*Total Amnt:* ₹${total.toFixed(0)}%0A%0A` +
                 `_Order placed via Kalika Web App_%0A` +
                 `_Thank you for choosing Kalika_`;

    const waUrl = `https://wa.me/918002914323?text=${waMsg}`;
    const newWindow = window.open(waUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.log("Popup blocker active, redirecting in-context");
      setTimeout(() => {
        window.location.href = waUrl;
      }, 1000);
    }

    // Voice feedback
    try {
      if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance("Order placed successfully. Thank you!");
        speech.rate = 1.1;
        window.speechSynthesis.speak(speech);
      }
      new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
    } catch (e) {}

    setShowSuccessPopup(false); 
    
    // Captured cart for success screen to avoid empty array if re-render occurs
    const itemsToPass = [...cart];

    // Clear cart AFTER capturing it for navigation
    onOrderPlaced({ id: orderId } as any);

    // Redirect to success page with data
    navigate('/order-success', { 
      state: { 
        orderId, 
        pin: orderPin, 
        phone: phoneInput,
        itemsCount: itemsToPass.length,
        total: total.toFixed(0),
        items: itemsToPass,
        customerName: user?.name || 'Guest',
        address: deliveryType === 'Delivery' ? manualAddress : 'Store Pickup (Ranchi)',
        slot: deliverySlot || 'Standard'
      } 
    });
  };

  const handleManualRedirection = () => {
    try {
      const itemsListMsg = cart.map(item => `• *${item.name}* x${item.quantity}`).join('%0A');
      const now = Date.now();
      const dateStr = new Date(now).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
      const message = `🛒 *New Order Received*%0A%0A*Order ID:* ${orderId || 'NEW'}%0A*Date:* ${dateStr}%0A%0A*Customer:* ${user?.name}%0A*Phone:* ${phoneInput}%0A*Address:* ${deliveryType === 'Delivery' ? manualAddress : 'Ranchi'}%0A%0A*Items:*%0A${itemsListMsg}%0A%0A*Total:* ₹${total.toFixed(0)}%0A%0A*CS Support:* 8002914323%0A_Please confirm._`;
      window.open(`https://wa.me/918002914323?text=${message}`, '_blank');
    } catch (e) {}
  };


  if (isPlaced) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center space-y-8">
        <motion.div 
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-32 h-32 bg-green-500 text-white rounded-[40px] flex items-center justify-center shadow-2xl shadow-green-500/30 relative"
        >
          <CheckCircle className="w-16 h-16" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-4 bg-green-500 rounded-[48px] -z-10"
          />
        </motion.div>
        
        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight"
          >
            ✅ Order Placed <span className="text-green-600">Successfully!</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 font-bold max-w-sm mx-auto uppercase tracking-widest text-[10px]"
          >
            Order ID: #{orderId.slice(-6).toUpperCase()} • Processed via WhatsApp
          </motion.p>
          {orderType === 'sell' && (
            <div className="bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl border border-blue-100 text-xs font-bold inline-block mt-4">
              Shops/Bulk Order: We will contact you soon for delivery details.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-green-50 p-8 rounded-[40px] border border-green-100 flex flex-col items-center justify-center gap-4"
          >
            <span className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">Delivery PIN</span>
            <span className="text-6xl font-black text-green-600 tracking-[0.3em] font-mono">{orderPin}</span>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-2 bg-white px-4 py-2 rounded-full">
              Show this to delivery partner
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 flex flex-col items-center justify-center gap-4 text-center"
          >
            <Smartphone className="w-10 h-10 text-gray-400" />
            <p className="text-sm font-black text-gray-700 tracking-tight">Need help?</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
              Customer, you will receive a verification call soon. You can also contact us manually.
            </p>
            <div className="flex gap-2">
              <a href="tel:9608123427" className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-900 hover:scale-110 transition-all">
                <Smartphone className="w-4 h-4" />
              </a>
              <a 
                href={`https://wa.me/918002914323?text=${encodeURIComponent(`Delivery PIN: ${orderPin} - Requesting delivery for Order #${orderId.slice(-6)}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-green-500 text-white rounded-2xl shadow-xl shadow-green-500/20 hover:scale-110 transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link 
            to="/orders"
            className="group relative bg-gray-900 text-white font-black px-10 py-5 rounded-[24px] shadow-2xl shadow-gray-900/10 hover:bg-black transition-all active:scale-95 text-xs uppercase tracking-[0.2em] flex items-center gap-3 overflow-hidden"
          >
            <FileText className="w-4 h-4" />
            Go to My Orders
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </Link>
          
          <Link 
            to={`/order-tracking/${orderId}`}
            className="bg-primary text-white font-black px-10 py-5 rounded-[24px] shadow-2xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 text-xs uppercase tracking-[0.2em] flex items-center gap-3"
          >
            <Navigation className="w-4 h-4" />
            Track Order
          </Link>
        </div>

        <div className="w-full max-w-3xl pt-8 border-t border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-black text-gray-900 tracking-tight uppercase tracking-widest">Our Store Location</h4>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Open in Ranchi</span>
          </div>
          <div className="h-[250px] rounded-[40px] overflow-hidden border border-gray-100 shadow-2xl relative group">
            <iframe 
              src={`https://www.google.com/maps?q=${liveLocation ? `${liveLocation.lat},${liveLocation.lng}` : '23.3884631,85.2795441'}&output=embed`}
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen 
              loading="lazy"
              referrerPolicy="no-referrer"
            ></iframe>
            <a 
              href={liveLocation ? `https://www.google.com/maps/search/?api=1&query=${liveLocation.lat},${liveLocation.lng}` : "https://www.google.com/maps/search/?api=1&query=23.3884631,85.2795441"}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]"
            >
              <div className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                Open in Google Maps
              </div>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 pt-12 px-6">
      {/* Success Popup Modal */}
      <AnimatePresence>
        {showSuccessPopup && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSuccessPopup(false)}
            />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl space-y-6 text-center"
            >
              <div className="w-24 h-24 bg-green-500 rounded-full mx-auto flex items-center justify-center text-white shadow-xl shadow-green-500/20">
                <CheckCircle className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight italic text-green-600">✅ ORDER PLACED SUCCESSFULLY</h3>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                  Your order has been recorded and shared with our team on WhatsApp.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl flex flex-col items-center gap-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery PIN</span>
                <span className="text-4xl font-black text-primary tracking-[0.2em]">{orderPin}</span>
              </div>
              <button 
                onClick={() => setShowSuccessPopup(false)}
                className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95"
              >
                GOT IT
              </button>
              <p className="text-[10px] text-gray-400 font-bold italic">Check your My Orders section for tracking.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Checkout Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (checkoutStep === 1) {
                  setCheckoutStep(0);
                } else {
                  navigate(-1);
                }
              }}
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 border border-gray-100 shadow-sm transition-all active:scale-95"
              title="Go Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-primary border border-gray-100 shadow-sm transition-all active:scale-95"
              title="Home"
            >
              <Home className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Checkout Step {checkoutStep + 1}</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{checkoutStep === 0 ? 'Delivery & Time' : 'Review & Confirm'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2">
            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${checkoutStep === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>1. Details & Slots</div>
            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${checkoutStep === 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>2. Review</div>
          </div>

          <AnimatePresence mode="wait">
            {checkoutStep === 0 && (
              <motion.div 
                key="step0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {/* Wallet Info (User requested: "load from the top") */}
                {user && walletBalance !== 0 && (
                  <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`p-6 rounded-[32px] overflow-hidden relative group border mb-8 ${
                      walletBalance > 0 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-red-50 border-red-200 shadow-lg shadow-red-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                          walletBalance > 0 ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            {walletBalance < 0 ? 'Outstanding Debt' : 'Wallet Status'}
                          </p>
                          <p className={`text-lg font-black tracking-tight ${walletBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            ₹{walletBalance.toFixed(2)}
                          </p>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${
                            walletBalance > 30 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {walletBalance > 0 ? 'Available for this order' : 'DUE PAYMENT (Compulsory)'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={() => {
                            if (walletBalance < 0) {
                              alert("Outstanding debt must be cleared with your next order. You cannot deselect this.");
                              return;
                            }
                            setUseWallet(!useWallet);
                          }}
                          className={`w-12 h-6 rounded-full relative transition-all ${
                            useWallet ? (walletBalance > 0 ? 'bg-blue-500' : 'bg-red-500') : 'bg-gray-200'
                          } ${walletBalance < 0 ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          <motion.div 
                            animate={{ x: useWallet ? 24 : 4 }} 
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${walletBalance < 0 ? 'animate-pulse' : ''}`}
                          />
                        </button>
                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          {walletBalance < 0 ? 'FIXED' : 'USE WALLET'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <button 
                    disabled={storeSettings?.isDeliveryEnabled === false}
                    onClick={() => setDeliveryType('Delivery')}
                    className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${
                      deliveryType === 'Delivery' ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-gray-100 text-gray-400'
                    } ${storeSettings?.isDeliveryEnabled === false ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                  >
                    <Truck className="w-10 h-10" />
                    <span className="text-sm font-black uppercase tracking-widest text-center">Home Delivery</span>
                    <span className="text-[10px] font-bold opacity-60">{storeSettings?.isDeliveryEnabled === false ? 'Currently Unavailable' : 'Within 10km Radius'}</span>
                  </button>
                  <button 
                    onClick={() => setDeliveryType('Takeaway')}
                    className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${
                      deliveryType === 'Takeaway' ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-gray-100 text-gray-400'
                    }`}
                  >
                    <ShoppingBag className="w-10 h-10" />
                    <span className="text-sm font-black uppercase tracking-widest text-center">Self Pickup</span>
                    <span className="text-[10px] font-bold opacity-60">Any Distance</span>
                  </button>
                </div>

                {deliveryType === 'Delivery' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-orange-50 rounded-[32px] border border-orange-100 flex items-start gap-4"
                  >
                    <div className="w-10 h-10 bg-orange-500 text-white rounded-2xl flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-orange-700">Delivery Restriction</p>
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-relaxed mt-1">
                        We currently deliver only within a 10km radius of our store location in Ranchi. Orders outside this range may be cancelled.
                      </p>
                    </div>
                  </motion.div>
                )}
                     {/* Address Section */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">
                        {deliveryType === 'Delivery' ? 'Delivery Address' : 'Pickup Details'}
                      </h3>
                    </div>
                    {deliveryType === 'Delivery' && (
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                        Jharkhand Only
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {deliveryType === 'Delivery' && (
                      <div className="space-y-4" ref={addressRef}>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Delivery Address</label>
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">⚠️ Please Use Live Location for accuracy</p>
                          </div>
                          <button 
                            onClick={handleGetLocation}
                            disabled={isLocating}
                            className="flex items-center gap-2 text-[10px] font-black text-white bg-primary px-4 py-2 rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95"
                          >
                            <Navigation className={`w-3 h-3 ${isLocating ? 'animate-pulse' : ''}`} />
                            {isLocating ? 'LOCATING...' : 'GET LIVE LOCATION'}
                          </button>
                        </div>
                        <textarea 
                          rows={3}
                          value={manualAddress}
                          onChange={(e) => {
                            setManualAddress(e.target.value);
                            if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                          }}
                          placeholder="Enter your full address, building name, and landmark..."
                          className={`w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 transition-all resize-none ${errors.address ? 'ring-2 ring-red-500 focus:ring-red-100' : 'focus:ring-primary/10'}`}
                        />
                        
                        {liveLocation && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="rounded-3xl overflow-hidden border border-gray-100 shadow-inner relative group h-[150px]"
                          >
                            <iframe 
                              src={`https://www.google.com/maps?q=${liveLocation.lat},${liveLocation.lng}&output=embed`}
                              width="100%" 
                              height="100%" 
                              style={{ border: 0 }} 
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            ></iframe>
                            <div className="absolute top-2 right-2 flex gap-2">
                               <div className="bg-primary text-white text-[8px] font-black uppercase px-2 py-1 rounded-lg shadow-lg">Exact Location Active</div>
                            </div>
                          </motion.div>
                        )}

                        {errors.address && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-2">{errors.address}</p>}
                      </div>
                    )}

                    {deliveryType === 'Takeaway' && (
                      <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">opp. Krishi Market beside hotel white House, Ranchi, Jharkhand</p>
                          <p className="text-xs text-gray-500 font-medium mt-1">Visit our store to collect your items. No delivery charges apply.</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4" ref={slotRef}>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select {deliveryType === 'Delivery' ? 'Delivery' : 'Pickup'} Slot</label>
                        {errors.slot && <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{errors.slot}</span>}
                      </div>
                        
                        {/* Day Selection Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {availableDays.map((day, i) => {
                            if (i === 0 && day.slots.length === 0) return null;
                            return (
                              <button
                                key={day.dateStr}
                                onClick={() => setSelectedDate(i)}
                                className={`flex flex-col items-center min-w-[100px] p-3 rounded-2xl border-2 transition-all ${
                                  selectedDate === i ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                }`}
                              >
                                <span className="text-[10px] font-black uppercase tracking-widest">{day.dayName}</span>
                                <span className="text-xs font-bold">{day.dateStr}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Slots Grid */}
                        <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                          <div className="grid grid-cols-2 gap-3 pb-2">
                            {availableDays[selectedDate].slots.length > 0 ? (
                              availableDays[selectedDate].slots.map((slot, idx) => {
                                const fullSlot = `${availableDays[selectedDate].dayName} (${slot})`;
                                return (
                                  <button
                                    key={`${slot}-${idx}`}
                                    onClick={() => {
                                      setDeliverySlot(fullSlot);
                                      if (errors.slot) setErrors(prev => ({ ...prev, slot: '' }));
                                    }}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                      deliverySlot === fullSlot ? 'bg-primary/5 border-primary text-primary' : 'bg-gray-50 border-transparent text-gray-500 hover:border-gray-200'
                                    } ${errors.slot && deliverySlot !== fullSlot ? 'border-red-100' : ''}`}
                                  >
                                    <span className="text-xs font-black tracking-tight">{slot}</span>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="col-span-2 py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No slots available for today</p>
                                {selectedDate === 0 && availableDays[1]?.slots.length > 0 && (
                                  <button 
                                    onClick={() => setSelectedDate(1)}
                                    className="mt-4 px-6 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                                  >
                                    Check Tomorrow
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                </div>

                {/* Payment Method Section */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-8" ref={paymentRef}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Payment Method</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-6 rounded-3xl border-2 transition-all flex items-center gap-4 text-left ${
                        paymentMethod === 'COD' ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-gray-100 text-gray-400'
                      }`}
                    >
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        <Banknote className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-widest">Cash on Delivery</p>
                        <p className="text-[10px] font-bold opacity-60">Pay when order arrives</p>
                      </div>
                    </button>

                    <button 
                      type="button"
                      disabled={walletBalance < 0}
                      onClick={() => {
                        if (walletBalance < 0) {
                          return;
                        }
                        if (walletBalance < total) {
                          alert("Low Balance! Please top up your wallet.");
                          return;
                        }
                        setPaymentMethod('WALLET');
                      }}
                      className={`p-6 rounded-3xl border-2 transition-all flex items-center gap-4 text-left relative overflow-hidden ${
                        paymentMethod === 'WALLET' ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-gray-100 text-gray-400'
                      } ${walletBalance < total ? 'opacity-80 bg-red-50/10' : ''} ${walletBalance < 0 ? 'cursor-not-allowed grayscale-[0.5]' : ''}`}
                    >
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-widest">{walletBalance < 0 ? 'Debt Recovery' : 'Wallet Payment'}</p>
                        <p className="text-[10px] font-bold opacity-60">Balance: ₹{walletBalance.toFixed(2)}</p>
                        {walletBalance < 0 && (
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter mt-1 block">Payable Debt: ₹{walletDue}</span>
                        )}
                        {walletBalance >= 0 && walletBalance < total && (
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter mt-1 block">Low Balance</span>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Phone Number Section (In-Checkout) */}
                  {(!user?.phone || phoneInput.length < 10) && (
                    <div id="checkout-phone-input" className={`p-6 bg-red-50 rounded-3xl border transition-all space-y-4 ${errors.phone ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-red-100'}`}>
                      <div className="flex items-center gap-3 text-red-600">
                        <Smartphone className="w-5 h-5" />
                        <p className="text-sm font-black uppercase tracking-widest">Add Phone Number</p>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">We need your phone number for verification calls before processing the order.</p>
                      <input 
                        id="checkout-phone-input-field"
                        type="tel"
                        value={phoneInput}
                        placeholder="Enter 10-digit phone number"
                        className={`w-full bg-white border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 transition-all ${errors.phone ? 'focus:ring-red-100 shadow-lg ring-red-500' : 'focus:ring-red-100'}`}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setPhoneInput(val);
                          if (val.length === 10 && errors.phone) {
                            setErrors(prev => ({ ...prev, phone: '' }));
                          }
                        }}
                      />
                      {errors.phone && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-2">{errors.phone}</p>}
                    </div>
                  )}

                  {/* Bag Toggle */}
                  <div className="pt-8 border-t border-gray-100">
                    <button 
                      onClick={() => setInBag(!inBag)}
                      className={`w-full flex items-center justify-between p-6 rounded-[32px] border-2 transition-all ${
                        inBag ? 'bg-primary/5 border-primary text-primary shadow-xl shadow-primary/10' : 'bg-gray-50 border-transparent text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          inBag ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white shadow-sm'
                        }`}>
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-black tracking-tight">Eco-friendly Bag</h4>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Help us reduce plastic</p>
                        </div>
                      </div>
                      <div className={`w-12 h-6 rounded-full relative transition-all ${inBag ? 'bg-primary' : 'bg-gray-300'}`}>
                        <motion.div animate={{ x: inBag ? 24 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleNextStep}
                  disabled={!phoneInput || phoneInput.length < 10}
                  className="w-full bg-primary text-white font-black py-6 rounded-[32px] shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                >
                  {(!phoneInput || phoneInput.length < 10) ? 'Enter Phone for Delivery' : 'Continue to Review'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {checkoutStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Order Review</h2>
                    <button 
                      onClick={() => setCheckoutStep(0)}
                      className="bg-gray-100 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Edit Details
                    </button>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-8 rounded-[32px] border border-gray-100">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Delivery To</p>
                        <p className="text-sm font-black text-gray-900 line-clamp-2">{deliveryType === 'Delivery' ? manualAddress : 'Store Pickup (Ranchi)'}</p>
                      </div>
                      <div className="md:text-right">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Selected Time Slot</p>
                        <p className="text-sm font-black text-gray-900">{deliverySlot || 'Standard Delivery'}</p>
                        {deliveryType === 'Takeaway' && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Self Collection</p>}
                      </div>
                    </div>

                  <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                      {paymentMethod === 'COD' ? <Banknote className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{paymentMethod === 'COD' ? 'Cash on Delivery' : 'Wallet Payment'}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {paymentMethod === 'COD' ? 'Pay when you receive' : `Paid from Wallet (Bal: ₹${walletBalance})`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => setCheckoutStep(0)} 
                      className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-[32px] font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all outline-none"
                    >
                      Back
                    </button>
                    
                    {/* Place Order Interaction */}
                    <div className="flex-[7] space-y-4">
                      <button
                        onClick={handlePlaceOrder}
                        disabled={isProcessing}
                        className={`w-full py-5 rounded-[28px] font-black text-lg uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                          isProcessing 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                            : 'bg-primary text-white shadow-primary/30 hover:bg-primary-dark cursor-pointer'
                        }`}
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-6 h-6" />
                            Place Order
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50 space-y-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] leading-relaxed text-center flex items-center justify-center gap-2">
                      <Phone className="w-3 h-3" />
                      Mandatory: Call 9608123427 for fastest delivery
                    </p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed text-center">
                      * If the order items are more then it can take more time than expected delivery.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-8 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-hide">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Order Summary</h2>
            
            <div className="space-y-4 pr-2">
              {cart.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                      <ProductImage src={item.image} alt={item.name} hasManualPhoto={item.hasManualPhoto} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.quantity} {item.selectedUnit || 'Piece'} x ₹{item.price}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-gray-900">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

                  <div className="pt-6 border-t border-gray-100 space-y-4">
                    <div className="flex justify-between text-sm font-bold text-gray-500">
                      <span>Subtotal</span>
                      <span className="text-gray-900">₹{subtotal}</span>
                    </div>
                    {walletDue > 0 && (
                      <div className="flex justify-between text-sm font-black text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                        <span className="flex items-center gap-2">
                           <AlertCircle className="w-4 h-4" />
                           Outstanding Debt
                        </span>
                        <span>+₹{walletDue}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-gray-500">
                      <span>Delivery Fee</span>
                      <span className={deliveryFee === 0 ? 'text-green-600 font-black' : 'text-gray-900'}>
                        {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                      </span>
                    </div>
              
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm font-bold text-green-600">
                  <span>Coupon Discount</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}

              {walletCredit > 0 && (
                <div className="flex justify-between text-sm font-bold text-blue-600">
                  <span>Wallet Payment</span>
                  <span>-₹{walletCredit}</span>
                </div>
              )}
              
              <div className="space-y-3">
                {suggestedCoupon && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/5 p-4 rounded-2xl border border-dashed border-primary/20 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Recommended Coupon</p>
                        <p className="text-sm font-black text-gray-900 tracking-tight">Use Code: {suggestedCoupon.code}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setCouponCode(suggestedCoupon.code);
                        // Small delay to show code in input then apply
                        setTimeout(() => {
                          const found = coupons.find(c => c.code === suggestedCoupon.code);
                          if (found) setAppliedCoupon(found);
                        }, 300);
                      }}
                      className="bg-primary text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                      APPLY NOW
                    </button>
                  </motion.div>
                )}

                <div className="relative group">
                  <input 
                    type="text" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Apply Coupon"
                    className={`w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-black tracking-widest focus:ring-4 transition-all ${couponError ? 'ring-2 ring-red-500 focus:ring-red-100' : appliedCoupon ? 'ring-2 ring-green-500 focus:ring-green-100' : 'focus:ring-primary/10'}`}
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-black transition-all"
                  >
                    APPLY
                  </button>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">
                  Coupon applicable only on selected items.
                </p>
                {couponError && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-2">{couponError}</p>}
                {appliedCoupon && (
                  <div className="flex items-center justify-between bg-green-50 p-3 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Coupon applied successfully.</span>
                    </div>
                    <button onClick={() => setAppliedCoupon(null)} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Remove</button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex flex-col gap-6">
            {storeSettings && !storeSettings.isFunctionallyOpen && (
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-orange-600 uppercase tracking-widest">Pre-Order Only</p>
                    <p className="text-[10px] text-orange-500 font-medium leading-relaxed">
                      {storeSettings?.message || "Store is currently closed. This will be placed as a PRE-ORDER for your selected slot."}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Amount</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-900 tracking-tighter">₹{total.toFixed(0)}</span>
                    {couponDiscount > 0 && <span className="text-sm font-bold text-gray-400 line-through">₹{subtotal + deliveryFee}</span>}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 font-medium text-center leading-relaxed">
              By placing this order you agree to our <span className="text-primary font-bold underline cursor-pointer">Terms & Conditions</span>. <br />
              <span className="text-blue-600 font-black uppercase text-[10px] tracking-widest block mt-2">📞 Call 9608123427 immediately after placing order to avoid delay</span>
              <span className="text-red-500 font-bold uppercase text-[8px] mt-1 block">Availability Notice:</span> If a product is unavailable, the order may be cancelled even if it appeared available on the app or website. <br />
              <span className="text-blue-600 font-black uppercase text-[8px]">Wallet Policy:</span> Wallet balances are adjusted by admin during order delivery based on actual payment received.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
