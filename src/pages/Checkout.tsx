import React, { useState, useRef, useEffect } from 'react';
import { CartItem, UserProfile, Order, Coupon, StoreSettings } from '../types';
import { useStore } from '../contexts/StoreContext';
import { MapPin, Truck, ShoppingBag, CreditCard, ArrowRight, CheckCircle, ShieldCheck, Clock, XCircle, Navigation, Smartphone, Wallet, Banknote, Sparkles, AlertCircle, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, updateDoc, db, addDoc, collection } from '../firebase';

interface CheckoutProps {
  cart: CartItem[];
  user: UserProfile | null;
  coupons: Coupon[];
  onOrderPlaced: (order: Order) => void;
  storeSettings?: StoreSettings | null;
}

const Checkout: React.FC<CheckoutProps> = ({ cart, user, coupons, onOrderPlaced, storeSettings }) => {
  const navigate = useNavigate();
  const [deliveryType, setDeliveryType] = useState<'Takeaway' | 'Delivery'>('Delivery');
  const [manualAddress, setManualAddress] = useState(user?.address || '');
  const [deliverySlot, setDeliverySlot] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD'>('COD');
  const [liveLocation, setLiveLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isPlaced, setIsPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [orderPin, setOrderPin] = useState('');
  const [inBag, setInBag] = useState(false);
  const [selectedDate, setSelectedDate] = useState(0); // 0: Today, 1: Tomorrow, etc.
  const [checkoutStep, setCheckoutStep] = useState<0 | 1>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addressRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  const { deliveryFee: configDeliveryFee, freeDeliveryThreshold: configThreshold } = useStore();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  const walletBalance = user?.walletBalance || 0;
  const walletDue = walletBalance < 0 ? Math.abs(walletBalance) : 0;
  const walletCredit = walletBalance > 0 ? Math.min(walletBalance, subtotal) : 0;

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    let discount = 0;
    if (appliedCoupon.type === 'percentage') {
      discount = (subtotal * appliedCoupon.discount) / 100;
      if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) {
        discount = appliedCoupon.maxDiscount;
      }
    } else {
      discount = appliedCoupon.discount;
    }
    return discount;
  };

  const couponDiscount = calculateDiscount();
  const deliveryFee = deliveryType === 'Delivery' ? (subtotal >= configThreshold ? 0 : configDeliveryFee) : 0;
  const total = Math.max(0, subtotal + deliveryFee - couponDiscount - walletCredit);

  const handleApplyCoupon = () => {
    setCouponError('');
    const found = coupons.find(c => c.code === couponCode.toUpperCase());
    
    if (!found) {
      setCouponError('Invalid coupon code');
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

    // Usage limit check would ideally be done here, but requires querying orders
    // For now, we'll apply it and check again during order placement
    setAppliedCoupon(found);
    setCouponError('');
  };

  const getAvailableSlots = () => {
    const days = [];
    const now = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      const day = date.getDay();
      
      let openTime = storeSettings?.openingTime || "08:30";
      let closeTime = storeSettings?.closingTime || "21:00";
      
      if (day === 0) { // Sunday
        openTime = storeSettings?.sundayOpeningTime || "10:00";
        closeTime = storeSettings?.sundayClosingTime || "15:00";
      }
      
      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);

      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      
      const daySlots: string[] = [];
      const startTime = openH * 60 + openM;
      const endTime = closeH * 60 + closeM;
      
      for (let m = startTime; m < endTime; m += 120) {
        const h = Math.floor(m / 60);
        const mins = m % 60;
        const h_end = Math.floor((m + 120) / 60);
        const mins_end = (m + 120) % 60;
        
        if (m + 120 > endTime) break;

        const formatTime = (hour: number, minute: number) => {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayH = hour % 12 || 12;
          return `${displayH}:${minute.toString().padStart(2, '0')} ${ampm}`;
        };

        daySlots.push(`${formatTime(h, mins)} - ${formatTime(h_end, mins_end)}`);
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
          return slotTime > currentTime + 45; // At least 45 mins in advance
        });
      }

      days.push({
        dayName,
        dateStr,
        slots: filteredSlots
      });
    }
    return days;
  };

  const availableDays = getAvailableSlots();

  // Auto-select next available day if today is exhausted
  useEffect(() => {
    if (availableDays.length > 0 && selectedDate === 0 && availableDays[0].slots.length === 0) {
      setSelectedDate(1);
    }
  }, [availableDays, selectedDate]);

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

          try {
            // Reverse geocoding using OpenStreetMap (Nominatim) - Free and no key required
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
            const data = await response.json();
            const address = data.display_name || `Jharkhand, Ranchi (Live Location: ${latitude}, ${longitude})`;
            setManualAddress(address);
            setLiveLocation({ lat: latitude, lng: longitude });
          } catch (e) {
            setManualAddress(prev => `Jharkhand, Ranchi\nLive Location: https://www.google.com/maps?q=${latitude},${longitude}`.trim());
            setLiveLocation({ lat: latitude, lng: longitude });
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
    }
  };

  const handlePlaceOrder = async () => {
    // Only ask once
    if (!window.confirm("Confirm your order placement?")) return;
    
    // Check if it's a pre-order (Tomorrow or beyond)
    const isPreOrder = selectedDate > 0;

    if (storeSettings && !storeSettings.isFunctionallyOpen && !isPreOrder) {
      // If store is closed and trying to order for "Today"
      const proceedAsPreOrder = window.confirm(`${storeSettings.message || "Store is currently closed."}\n\nWould you like to place a PRE-ORDER for tomorrow instead?`);
      if (proceedAsPreOrder) {
        setSelectedDate(1); // Set to Tomorrow
        slotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      return;
    }

    if (!user) {
      alert("Please sign in to place an order.");
      navigate('/login');
      return;
    }

    if (deliveryType === 'Delivery') {
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
          navigate('/profile');
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

    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId: user?.uid || 'guest',
      userName: user?.name || 'Guest',
      userPhone: user?.phone || 'N/A',
      items: cart,
      total,
      status: 'Pending',
      isPreOrder: !storeSettings?.isFunctionallyOpen,
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

    // Pre-order check logic...
    const preorderFlag = selectedDate > 0 || !storeSettings?.isFunctionallyOpen;

    const finalOrder = {
      ...newOrder,
      isPreOrder: preorderFlag,
      discount: couponDiscount,
      walletAdjusted: walletCredit > 0,
      walletRedeemed: walletCredit
    };

    try {
      // 1. SAVE TO FIRESTORE
      const docRef = await addDoc(collection(db, 'orders'), finalOrder);
      setOrderId(docRef.id);

      // 2. CLEAR CART
      onOrderPlaced(newOrder); 
      
      // 3. UPDATE USER WALLET
      if (user) {
        const updates: any = {};
        
        // Use wallet balance if applied
        if (walletCredit > 0) {
          updates.walletBalance = walletBalance - walletCredit;
          
          // Log transaction
          await addDoc(collection(db, 'walletTransactions'), {
            userId: user.uid,
            amount: -walletCredit,
            balanceAfter: updates.walletBalance,
            type: 'order_payment',
            description: `Payment for Order #${newOrder.id.slice(-6).toUpperCase()}`,
            orderId: newOrder.id,
            createdAt: Date.now()
          });
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'users', user.uid), updates);
        }
      }

      setOrderPin(pin);
      setIsPlaced(true);

      // Speak & Sound
      const speech = new SpeechSynthesisUtterance("Order Placed Successfully. Thank you for shopping with Kalika Store.");
      window.speechSynthesis.speak(speech);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log("Audio play failed:", e));

      // Notification
      const adminNumbers = ['916205284423', '919608123427', '919905516803'];
      const message = `New Order! ID: ${docRef.id}%0ATotal: ₹${total}%0AAddress: ${manualAddress || 'Takeaway'}`;
      window.open(`https://wa.me/${adminNumbers[0]}?text=${message}`, '_blank');

    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
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
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Order Placed Successfully!</h1>
          <p className="text-gray-500 font-medium max-w-sm mx-auto">Thank you for shopping with Kalika Store. Your order #{orderId} is being processed.</p>
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 max-w-sm mx-auto space-y-3">
            <p className="text-sm font-black text-primary">Customer, you will receive a verification call soon or call by your own to 9608123427</p>
            <a 
              href="tel:9608123427"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              <Smartphone className="w-4 h-4" />
              Call Now: 9608123427
            </a>
          </div>
        </div>

        {/* Store Map */}
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black text-gray-900 tracking-tight">Store Location</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ranchi, Jharkhand</p>
            </div>
          </div>
          <div className="h-[200px] rounded-[32px] overflow-hidden border border-gray-100 shadow-inner relative group">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3662.334460453303!2d85.2795441!3d23.3884631!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDIzJzE4LjUiTiA4NcKwMTYnNDYuNCJF!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen 
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <a 
              href="https://www.google.com/maps/search/?api=1&query=23.3884631,85.2795441"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <div className="bg-white text-gray-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl">
                Open in Google Maps
              </div>
            </a>
          </div>
          {deliveryType === 'Takeaway' && (
            <motion.a
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              href="https://maps.app.goo.gl/ejW8MKHT5Y2V1DW2A?g_st=aw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-primary text-white p-6 rounded-[32px] font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-primary-dark transition-all"
            >
              <Navigation className="w-6 h-6" />
              Navigate to Store
            </motion.a>
          )}
        </div>
        
        <div className="bg-primary/5 p-8 rounded-[40px] border border-primary/10 max-w-md w-full space-y-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verification PIN</span>
            <span className="text-5xl font-black text-primary tracking-[0.5em]">{orderPin}</span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Show this to the delivery partner</p>
          </div>
          
          <div className="pt-6 border-t border-primary/10 grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 flex items-center justify-center text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Est. Delivery</span>
              <span className="text-sm font-black text-gray-900">1-2 Hours</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Secure Order</span>
              <span className="text-sm font-black text-gray-900">Verified</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notify Admins</span>
            <div className="flex gap-2">
              {['6205284423', '9608123427', '9905516803'].map(num => (
                <button 
                  key={num}
                  onClick={() => {
                    const msg = `New Order Received!%0AOrder ID: ${orderId}%0ATotal: ₹${total}`;
                    window.open(`https://wa.me/91${num}?text=${msg}`, '_blank');
                  }}
                  className="bg-green-600 text-white text-[10px] font-bold px-4 py-2 rounded-xl shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all"
                >
                  {num.slice(-4)}
                </button>
              ))}
            </div>
          </div>
          <Link 
            to="/profile"
            className="bg-gray-900 text-white font-bold px-12 py-5 rounded-3xl shadow-2xl shadow-gray-900/30 hover:bg-black transition-all active:scale-95"
          >
            Track Order
          </Link>
          <Link 
            to="/"
            className="bg-primary text-white font-bold px-12 py-5 rounded-3xl shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95"
          >
            Back to Home
          </Link>
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
              <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <button 
                    onClick={() => setDeliveryType('Delivery')}
                    className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${
                      deliveryType === 'Delivery' ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-gray-100 text-gray-400'
                    }`}
                  >
                    <Truck className="w-10 h-10" />
                    <span className="text-sm font-black uppercase tracking-widest text-center">Home Delivery</span>
                    <span className="text-[10px] font-bold opacity-60">Within 10km Radius</span>
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
                  <div className="p-6 bg-orange-50 rounded-[32px] border border-orange-100 flex items-start gap-4">
                    <div className="w-10 h-10 bg-orange-500 text-white rounded-2xl flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-orange-700">Delivery Restriction</p>
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-relaxed mt-1">
                        We currently deliver only within a 10km radius of our store location in Ranchi. Orders outside this range may be cancelled.
                      </p>
                    </div>
                  </div>
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
                  {errors.address && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-2">{errors.address}</p>}
                </div>

                <div className="space-y-4" ref={slotRef}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Delivery Slot</label>
                    {errors.slot && <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{errors.slot}</span>}
                  </div>
                  
                  {/* Day Selection Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {availableDays.map((day, i) => (
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
                    ))}
                  </div>

                  {/* Slots Grid */}
                  <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                    <div className="grid grid-cols-2 gap-3 pb-2">
                      {availableDays[selectedDate].slots.length > 0 ? (
                        availableDays[selectedDate].slots.map((slot) => {
                          const fullSlot = `${availableDays[selectedDate].dayName} (${slot})`;
                          return (
                            <button
                              key={slot}
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
                          <button 
                            onClick={() => setSelectedDate(1)}
                            className="mt-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                          >
                            Check Tomorrow
                          </button>
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
                    <a 
                      href="https://maps.app.goo.gl/ejW8MKHT5Y2V1DW2A?g_st=aw" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 text-xs font-black text-primary bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all border border-primary/10"
                    >
                      <Navigation className="w-3 h-3" />
                      Open in Google Maps
                    </a>
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
                  className={`w-full bg-white border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 transition-all ${errors.phone ? 'focus:ring-red-100' : 'focus:ring-red-100'}`}
                  onChange={(e) => {
                    if (user && e.target.value.length === 10) {
                      updateDoc(doc(db, 'users', user.uid), { phone: e.target.value })
                        .then(() => {
                          if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                        })
                        .catch(err => console.error("Update phone failed", err));
                    }
                  }}
                />
                {errors.phone && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-2">{errors.phone}</p>}
              </div>
            )}

            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Banknote className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900">Cash on Delivery (COD)</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pay when you receive your order</p>
              </div>
            </div>

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
          <motion.div key="step1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
            {/* Wallet Info (User requested: "load from the top") */}
            {user && walletBalance !== 0 && (
              <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`p-6 rounded-[32px] overflow-hidden relative group border ${
                  walletBalance > 0 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Wallet className={`w-16 h-16 ${walletBalance > 0 ? 'text-blue-600' : 'text-red-600'}`} />
                </div>
                <div className="flex items-center justify-between gap-6 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Wallet className={`w-5 h-5 ${walletBalance > 0 ? 'text-blue-600' : 'text-red-600'}`} />
                      <h4 className={`text-lg font-black tracking-tight ${walletBalance > 0 ? 'text-blue-900' : 'text-red-900'}`}>
                        Digital Wallet
                      </h4>
                    </div>
                    <p className={`text-xs font-medium ${walletBalance > 0 ? 'text-blue-700/80' : 'text-red-700/80'}`}>
                      Current Balance: <span className="font-black">₹{walletBalance}</span>
                    </p>
                    {walletCredit > 0 && (
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">
                        Applied: -₹{walletCredit}
                      </p>
                    )}
                    {walletDue > 0 && (
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-tight">
                        Note: Your outstanding dues of ₹{walletDue} will be adjusted by admin during order delivery or you can pay them now.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Order Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-8 rounded-[32px]">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Delivery To</p>
                  <p className="text-sm font-bold text-gray-900 line-clamp-2">{manualAddress || 'Pickup at Store'}</p>
                </div>
                <div className="md:text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Time Slot</p>
                  <p className="text-sm font-bold text-gray-900">{deliverySlot}</p>
                </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Cash on Delivery</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pay when you receive</p>
                </div>
              </div>

              {!user?.phone && (
                <div className="p-6 bg-red-50 rounded-3xl border border-red-500">
                  <p className="text-sm font-black text-red-600">Verification Call Number Needed</p>
                  <input 
                    type="tel"
                    onChange={(e) => {
                      if (e.target.value.length === 10 && user) {
                        updateDoc(doc(db, 'users', user.uid), { phone: e.target.value });
                      }
                    }}
                    className="w-full mt-4 p-4 rounded-xl border-none focus:ring-4 focus:ring-red-100"
                    placeholder="Enter 10-digit phone number"
                  />
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={() => setCheckoutStep(0)} className="flex-1 py-5 bg-gray-100 rounded-[32px] font-black uppercase text-[10px]">Back</button>
                <button 
                  onClick={handlePlaceOrder}
                  className="flex-[2] bg-primary text-white font-black py-5 rounded-[32px] shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all uppercase tracking-widest text-[10px]"
                >
                  Place Order (₹{total.toFixed(0)})
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
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                      {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
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

            <div className="pt-8 border-t border-gray-100 space-y-4">
              <div className="flex justify-between text-sm font-bold text-gray-500">
                <span>Subtotal</span>
                <span className="text-gray-900">₹{subtotal}</span>
              </div>
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
                <div className="relative group">
                  <input 
                    type="text" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Apply Coupon"
                    className={`w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-black tracking-widest focus:ring-4 transition-all ${couponError ? 'focus:ring-red-100' : 'focus:ring-primary/10'}`}
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-black transition-all"
                  >
                    APPLY
                  </button>
                </div>
                {couponError && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-2">{couponError}</p>}
                {appliedCoupon && (
                  <div className="flex items-center justify-between bg-green-50 p-3 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Coupon Applied: {appliedCoupon.code}</span>
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
