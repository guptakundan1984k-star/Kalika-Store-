import React, { useState, useRef, useEffect } from 'react';
import { CartItem, UserProfile, Order, Coupon, StoreSettings } from '../types';
import { useStore } from '../contexts/StoreContext';
import { MapPin, Truck, ShoppingBag, CreditCard, ArrowRight, CheckCircle, ShieldCheck, Clock, XCircle, Navigation, Smartphone, Wallet, Banknote, Sparkles, AlertCircle, IndianRupee, FileText, ArrowLeft, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, updateDoc, db, addDoc, setDoc, collection, getDoc, getDocs, query, where, onSnapshot, handleFirestoreError, OperationType, increment } from '../firebase';
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

const Checkout: React.FC<CheckoutProps> = ({ cart, user, coupons, onOrderPlaced, storeSettings }) => {
  const navigate = useNavigate();

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
  const [inWalletStep, setInWalletStep] = useState(false); // To handle back button in payment
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  const walletCredit = walletBalance > 0 ? Math.min(walletBalance, subtotal + deliveryFee - couponDiscount) : 0;

  // Total should include any outstanding debt (walletDue)
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
        openTime = storeSettings?.sundayOpeningTime || "08:30";
        closeTime = storeSettings?.sundayClosingTime || "20:00";
      }
      
      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);

      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      
      const daySlots: string[] = [];
      const startTime = openH * 60 + openM;
      const endTime = closeH * 60 + closeM;
      
      const formatTime = (hour: number, minute: number) => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayH = hour % 12 || 12;
        return `${displayH}:${minute.toString().padStart(2, '0')} ${ampm}`;
      };

      for (let m = startTime; m < endTime; m += 120) {
        // Slot 1: m to m + 60 (1 hour)
        if (m + 60 <= endTime) {
          const h1 = Math.floor(m / 60);
          const m1 = m % 60;
          const h2 = Math.floor((m + 60) / 60);
          const m2 = (m + 60) % 60;
          daySlots.push(`${formatTime(h1, m1)} - ${formatTime(h2, m2)}`);
        }
        
        // Slot 2: m + 30 to m + 90 (1 hour, starts 30 mins after slot 1)
        if (m + 90 <= endTime) {
          const h3 = Math.floor((m + 30) / 60);
          const m3 = (m + 30) % 60;
          const h4 = Math.floor((m + 90) / 60);
          const m4 = (m + 90) % 60;
          daySlots.push(`${formatTime(h3, m3)} - ${formatTime(h4, m4)}`);
        }
      }

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
      if (deliveryType === 'Delivery') {
        if (!manualAddress || manualAddress.length < 10) {
          setErrors(prev => ({ ...prev, address: "Please provide a valid address (min 10 chars)." }));
          addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (!deliverySlot) {
          setErrors(prev => ({ ...prev, slot: "Please select a 1-2 hour delivery slot." }));
          slotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      if (!user?.phone) {
        setErrors(prev => ({ ...prev, phone: "Phone number required for delivery." }));
        const phoneInput = document.getElementById('checkout-phone-input');
        if (phoneInput) {
          phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      setCheckoutStep(1); // Go straight to Review
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePlaceOrder = async () => {
    console.log("Place Order initiated");
    // Environmental Check
    if (isEnvironmentClosed) {
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
      // If store is closed and trying to order for "Today"
      const proceedAsPreOrder = window.confirm(`${storeSettings.message || "Store is currently closed."}\n\nWould you like to place a PRE-ORDER for tomorrow instead?`);
      if (proceedAsPreOrder) {
        setSelectedDate(1); // Set to Tomorrow
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
      return;
    }

    if (deliveryType === 'Delivery') {
      if (storeSettings?.isDeliveryEnabled === false) {
        alert("Home delivery is currently unavailable. Please choose Self Pickup.");
        setDeliveryType('Takeaway');
        return;
      }
      if (!manualAddress || manualAddress.length < 10) {
        setErrors(prev => ({ ...prev, address: "Give the correct address (minimum 10 characters required)." }));
        setCheckoutStep(0);
        setTimeout(() => {
          addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }

      const addressLower = manualAddress.toLowerCase();
      const hasJharkhand = addressLower.includes('jharkhand') || addressLower.includes('ranchi') || addressLower.includes('google.com/maps') || addressLower.includes('india');
      
      if (!hasJharkhand) {
        setErrors(prev => ({ ...prev, address: "Not detected Jharkhand address. We currently only deliver in Jharkhand." }));
        setCheckoutStep(0);
        setTimeout(() => {
          addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
    }

    if (!user?.phone) {
      setErrors(prev => ({ ...prev, phone: "Please add your phone number for verification calls." }));
      setCheckoutStep(0);
      setTimeout(() => {
        const phoneInput = document.getElementById('checkout-phone-input');
        if (phoneInput) {
          phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          phoneInput.focus();
        } else {
          alert("Please update your phone number in your profile.");
        }
      }, 100);
      return;
    }

    if (deliveryType === 'Delivery' && !deliverySlot) {
      setErrors(prev => ({ ...prev, slot: "Please select a delivery slot." }));
      setCheckoutStep(0);
      setTimeout(() => {
        slotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    if (!paymentMethod) {
      setErrors(prev => ({ ...prev, payment: "Please select a payment method." }));
      paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (paymentMethod === 'WALLET' && walletBalance < total && total > 0) {
      if (!window.confirm(`Your wallet balance is low. ₹${walletBalance} will be used from wallet, and rest ₹${total} will be collected during delivery. Proceed?`)) {
        return;
      }
    }

    // Validation: Check for zero quantities
    const hasZeroQty = cart.some(item => (item.quantity || 0) <= 0);
    if (hasZeroQty) {
      alert("Some items in your cart have 0 quantity. Please adjust them before ordering.");
      return;
    }

    setIsProcessing(true);
    console.log("Processing order started...");

    try {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const generatedOrderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      
      const newOrder: Order = {
        id: generatedOrderId,
        userId: user?.uid || 'guest',
        userName: user?.name || 'Guest',
        userPhone: user?.phone || 'N/A',
        items: cart,
        total,
        status: 'Pending',
        isPreOrder: selectedDate > 0 || !storeSettings?.isFunctionallyOpen,
        deliveryType,
        address: deliveryType === 'Delivery' ? {
          manual: manualAddress,
          lat: liveLocation?.lat,
          lng: liveLocation?.lng,
          liveLocationUrl: liveLocation ? `https://www.google.com/maps?q=${liveLocation.lat},${liveLocation.lng}` : undefined
        } : undefined,
        deliverySlot,
        paymentMethod,
        inBag,
        pin,
        createdAt: Date.now(),
      };

      const finalOrder = {
        ...newOrder,
        discount: couponDiscount,
        walletAdjusted: (walletCredit > 0 || walletDue > 0),
        walletRedeemed: walletCredit,
        walletDebtSettle: walletDue,
        total: total 
      };

      console.log("Saving order to Firestore...", finalOrder.id);
      // 1. SAVE TO FIRESTORE
      await setDoc(doc(db, 'orders', finalOrder.id), finalOrder);
      setOrderId(finalOrder.id);

      // increment coupon usage
      if (appliedCoupon) {
        updateDoc(doc(db, 'coupons', appliedCoupon.id), {
          usedCount: increment(1)
        }).catch(e => console.error("Coupon increment failed", e));
      }

      console.log("Order saved. Calling onOrderPlaced...");
      // 2. NOTIFY PARENT (CLEAR CART)
      onOrderPlaced(finalOrder as any); 

      // 3. UPDATE USER WALLET
      if (user) {
        const updates: any = {};
        if (walletCredit > 0) {
          updates.walletBalance = walletBalance - walletCredit;
          addDoc(collection(db, 'walletTransactions'), {
            userId: user.uid,
            amount: -walletCredit,
            balanceAfter: updates.walletBalance,
            type: 'order_payment',
            description: `Payment for Order #${newOrder.id.slice(-6).toUpperCase()}`,
            orderId: newOrder.id,
            createdAt: Date.now()
          }).catch(txError => console.error("Wallet transaction failed:", txError));
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'users', user.uid), updates).catch(e => console.error("User wallet update failed", e));
        }
      }

      setOrderPin(pin);
      setIsPlaced(true);
      console.log("Order placement successful");

      // Voice & Sound feedback
      try {
        const speech = new SpeechSynthesisUtterance(`Order Placed Successfully. Your delivery PIN is ${pin}. Check WhatsApp for details.`);
        window.speechSynthesis.speak(speech);
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play failed:", e));
      } catch (mediaErr) {
        console.warn("Media feedback failed", mediaErr);
      }

      // 4. PREPARE WHATSAPP (BUT DON'T AUTO-REDIRECT WITH TIMEOUT TO AVOID BLOCKING)
      // We will rely on the "WhatsApp Admin" button in the success UI
      
      // --- PUSH NOTIFICATIONS ---
      notificationService.sendNotification({
        userIds: [user?.uid || ''],
        title: "Order Placed! 🛍️",
        body: `Your order #${finalOrder.id.slice(-6).toUpperCase()} has been placed. PIN: ${pin}`,
        type: 'order'
      }).catch(notifErr => console.error("Push notification failed", notifErr));

    } catch (error) {
      console.error("Critical error in handlePlaceOrder:", error);
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      alert("Failed to place order. Please check your internet connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isPlaced) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center space-y-12">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-32 h-32 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30"
        >
          <CheckCircle className="w-16 h-16" />
        </motion.div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-green-600 tracking-tight">Order Placed Successfully!</h1>
          <p className="text-gray-500 font-medium max-w-sm mx-auto">Thank you for your order. Redirecting to your orders soon...</p>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100 max-w-sm mx-auto space-y-3">
            <p className="text-sm font-black text-green-700">Customer, you will receive a verification call soon or call us at 9608123427</p>
            <a 
              href="tel:9608123427"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              Call Now: 9608123427
            </a>
          </div>
        </div>

        <div className="bg-green-50 p-8 rounded-[40px] border border-green-100 max-w-md w-full space-y-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Verification PIN</span>
            <span className="text-5xl font-black text-green-600 tracking-[0.5em]">{orderPin}</span>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-2">Show this to the delivery partner</p>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Link 
            to="/orders"
            className="bg-gray-900 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-gray-900/10 hover:bg-black transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            My Orders
          </Link>
          <Link 
            to={`/order-tracking/${orderId}`}
            className="bg-primary text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            Track Order
          </Link>
          <a
            href={`https://wa.me/918002914323?text=${encodeURIComponent(`Order PIN: ${orderPin} - Requesting delivery for Order #${orderId.slice(-6)}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-green-500/20 hover:bg-[#128C7E] transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            WhatsApp Admin
          </a>
        </div>
        
        <div className="w-full max-w-md space-y-6">
          <h4 className="text-sm font-black text-gray-900 tracking-tight text-center">Store Location</h4>
          <div className="h-[250px] rounded-[32px] overflow-hidden border border-gray-100 shadow-inner relative group">
            {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
              <iframe 
                src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${liveLocation ? `${liveLocation.lat},${liveLocation.lng}` : '23.3884631,85.2795441'}`}
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            ) : (
              <iframe 
                src={`https://maps.google.com/maps?q=${liveLocation ? `${liveLocation.lat},${liveLocation.lng}` : '23.3884631,85.2795441'}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            )}
            <a 
              href={liveLocation ? `https://www.google.com/maps/search/?api=1&query=${liveLocation.lat},${liveLocation.lng}` : "https://www.google.com/maps/search/?api=1&query=23.3884631,85.2795441"}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <div className="bg-white text-gray-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl">
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
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Checkout Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Checkout Step {checkoutStep + 1}</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{checkoutStep === 0 ? 'Delivery & Time' : 'Review & Confirm'}</p>
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
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                        walletBalance > 0 ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Wallet Status</p>
                        <p className="text-lg font-black text-gray-900 tracking-tight">₹{walletBalance.toFixed(2)}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${
                          walletBalance > 30 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {walletBalance > 30 ? 'Balance for instant pay' : 'Low Balance! Top up soon'}
                        </p>
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
                        {deliveryType === 'Delivery' ? 'Delivery Address' : 'Pickup Location'}
                      </h3>
                    </div>
                    {deliveryType === 'Delivery' && (
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                        Jharkhand Only
                      </span>
                    )}
                  </div>

                  {deliveryType === 'Delivery' ? (
                    <div className="space-y-6">
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
                              src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${liveLocation.lat},${liveLocation.lng}&zoom=16`}
                              width="100%" 
                              height="100%" 
                              style={{ border: 0 }} 
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                            <div className="absolute top-2 right-2 flex gap-2">
                               <div className="bg-primary text-white text-[8px] font-black uppercase px-2 py-1 rounded-lg shadow-lg">Exact Location Active</div>
                            </div>
                          </motion.div>
                        )}

                        {errors.address && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-2">{errors.address}</p>}
                      </div>

                      <div className="space-y-4" ref={slotRef}>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Delivery Slot</label>
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
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">opp. Krishi Market beside hotel white House, Ranchi, Jharkhand</p>
                          <p className="text-xs text-gray-500 font-medium mt-1">Visit our store to collect your items. No delivery charges apply.</p>
                        </div>
                      </div>
                    </div>
                  )}
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
                  {!user?.phone && (
                    <div id="checkout-phone-input" className={`p-6 bg-red-50 rounded-3xl border transition-all space-y-4 ${errors.phone ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-red-100'}`}>
                      <div className="flex items-center gap-3 text-red-600">
                        <Smartphone className="w-5 h-5" />
                        <p className="text-sm font-black uppercase tracking-widest">Add Phone Number</p>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">We need your phone number for verification calls before processing the order.</p>
                      <input 
                        type="tel"
                        placeholder="Enter 10-digit phone number"
                        className={`w-full bg-white border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 transition-all ${errors.phone ? 'focus:ring-red-100 shadow-lg ring-red-500' : 'focus:ring-red-100'}`}
                        onChange={(e) => {
                          if (user && e.target.value.length === 10) {
                            updateDoc(doc(db, 'users', user.uid), { phone: e.target.value })
                              .then(() => { if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })); })
                              .catch(err => console.error("Update phone failed", err));
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
                  className="w-full bg-primary text-white font-black py-6 rounded-[32px] shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2"
                >
                  Continue to Review
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-8 rounded-[32px]">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Delivery To</p>
                      <p className="text-sm font-bold text-gray-900 line-clamp-2">{deliveryType === 'Delivery' ? manualAddress : 'Store Pickup'}</p>
                    </div>
                    <div className="md:text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Time Slot</p>
                      <p className="text-sm font-bold text-gray-900">{deliveryType === 'Delivery' ? deliverySlot : 'N/A'}</p>
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
                      className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[32px] font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all outline-none"
                    >
                      Back to Details
                    </button>
                    <button 
                      onClick={handlePlaceOrder}
                      disabled={isProcessing}
                      className={`flex-[2] relative overflow-hidden group bg-green-600 text-white font-black py-5 rounded-[32px] shadow-2xl shadow-green-600/30 hover:bg-green-700 transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 outline-none ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Finalizing Order...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                          <span>Confirm & Place Order (₹{total.toFixed(0)})</span>
                        </>
                      )}
                      
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </button>
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
                      <ProductImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
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
              {!storeSettings?.isFunctionallyOpen && (
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
              <span className="text-blue-600 font-black uppercase text-[8px]">Wallet Policy:</span> Wallet balances are adjusted by admin during order delivery based on actual payment received.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
