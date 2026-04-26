import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { LoadingScreen } from './components/LoadingScreen';
import { VoiceAssistant } from './components/VoiceAssistant';
import ScrollToTop from './components/ScrollToTop';
import { Product, CartItem, UserProfile, Order, Category, Coupon, Banner, StoreSettings, ProductUnit } from './types';
import { CATEGORIES } from './constants';
import { INITIAL_PRODUCTS } from './data/initialProducts';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, ArrowUp } from 'lucide-react';

// Firebase
import { 
  auth, db, onAuthStateChanged, collection, doc, 
  onSnapshot, query, where, orderBy, setDoc, getDoc, updateDoc, addDoc, deleteDoc, getDocs,
  handleFirestoreError, OperationType
} from './firebase';

// Pages
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Categories from './pages/Categories';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetail from './pages/ProductDetail';
import Wishlist from './pages/Wishlist';
import BillPage from './pages/BillPage';
import Items from './pages/Items';
import { MyOrders } from './pages/MyOrders';
import { OrderTracking } from './pages/OrderTracking';
import { BulkEnquiryPage } from './pages/BulkEnquiryPage';
import { AddressesPage } from './pages/AddressesPage';
import { HelpSupportPage } from './pages/HelpSupportPage';
import { PhotoBillPage } from './pages/PhotoBillPage';
import Scan from './pages/Scan';
import { ProductRequestModal } from './components/ProductRequestModal';
import { LoginPromptModal } from './components/LoginPromptModal';
import { StoreStatusBanner } from './components/StoreStatusBanner';
import { LanguagePromptModal } from './components/LanguagePromptModal';
import { IntroVideoModal } from './components/IntroVideoModal';

import { useStore } from './contexts/StoreContext';

export default function App() {
  const { setUser: setContextUser } = useStore();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // Show intro only once per customer
    if (user && !user.introSeen) {
      setShowIntro(true);
      updateDoc(doc(db, 'users', user.uid), { introSeen: true }).catch(err => console.error("Intro state sync failed", err));
    }
  }, [user]);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // Check if splash has been shown in this session
    return sessionStorage.getItem('splashShown') !== 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [cartNotification, setCartNotification] = useState<{ show: boolean, productName: string } | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Back to Top Visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cart Persistence
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const toggleWishlist = async (productId: string) => {
    if (!user) return;
    const currentWishlist = user.wishlist || [];
    const newWishlist = currentWishlist.includes(productId)
      ? currentWishlist.filter(id => id !== productId)
      : [...currentWishlist, productId];
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { wishlist: newWishlist });
      // setUser is handled by onSnapshot
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Auth & User Profile Listener
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // Listen to user profile changes in real-time
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          const isAdmin = firebaseUser.email === 'customercare@kalikastore.in' ||
                         firebaseUser.email === 'kalikastore.info@gmail.com' || 
                         firebaseUser.email === 'guptakundan1984k@gmail.com' ||
                         firebaseUser.email === 'anshgupta4525@gmail.com' ||
                         ['u0wqoiZcqsVrIbCjwI2osKeRLZo1', 'yaOovg7opUSgrQbsJ6abztHuOV03'].includes(firebaseUser.uid) ||
                         ['+919608123427', '+916205284423', '+919905516803'].includes(firebaseUser.phoneNumber || '');

          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            if (isAdmin && userData.role !== 'admin') {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
            }
            setUser(userData);
            setContextUser(userData);
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Guest',
              email: firebaseUser.email || '',
              phone: firebaseUser.phoneNumber || '',
              role: isAdmin ? 'admin' : 'user',
              address: '',
              wishlist: []
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setContextUser(newUser);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`, false);
        });
      } else {
        setUser(null);
        setContextUser(null);
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Real-time Products Listener
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products', false);
    });
    return () => unsubscribe();
  }, []);

  const ordersRef = React.useRef<Order[]>([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Real-time Banners Listener (Public)
  useEffect(() => {
    const qBanners = query(collection(db, 'banners'));
    const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'banners', false);
    });
    return () => unsubscribeBanners();
  }, []);

  // Real-time Store Settings Listener
  useEffect(() => {
    let checkInterval: any;

    const unsubscribeStore = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        
        const updateFunctionalStatus = () => {
          // Automated Open/Close Logic
          const now = new Date();
          const day = now.getDay(); 
          const currentTimeInMins = now.getHours() * 60 + now.getMinutes();

          const parseTime = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
          };

          let isOpenBySchedule = true;
          if (data.autoSchedule) {
            if (day === 0) { // Sunday
              const open = parseTime(data.sundayOpeningTime || '10:40');
              const close = parseTime(data.sundayClosingTime || '15:00');
              isOpenBySchedule = currentTimeInMins >= open && currentTimeInMins < close;
            } else { // Mon-Sat
              const open = parseTime(data.openingTime || '10:40');
              const close = parseTime(data.closingTime || '20:00');
              isOpenBySchedule = currentTimeInMins >= open && currentTimeInMins < close;
            }
          }

          // Store is ALWAYS functional for browsing and pre-ordering
          // but functionallyReady determines if it's "Ready for Delivery"
          const functionallyReady = data.isOpen && (!data.autoSchedule || isOpenBySchedule);

          let displayMessage = data.message;
          if (data.isOpen && data.autoSchedule && !isOpenBySchedule) {
            const dayName = day === 0 ? 'Sunday' : 'Mon-Sat';
            const times = day === 0 ? `${data.sundayOpeningTime} to ${data.sundayClosingTime}` : `${data.openingTime} to ${data.closingTime}`;
            displayMessage = `Currently accepting Pre-orders for ${dayName === 'Sunday' ? 'Monday' : 'Next Day'}. Standard hours: ${times}.`;
          }

          setStoreSettings(prev => ({
            ...data,
            isFunctionallyOpen: functionallyReady,
            message: displayMessage || data.message
          }));
        };

        updateFunctionalStatus();
        
        // Re-check every minute for auto-schedule
        if (checkInterval) clearInterval(checkInterval);
        checkInterval = setInterval(updateFunctionalStatus, 60000);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/store', false);
    });

    return () => {
      unsubscribeStore();
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // Order Cleanup Logic (Remove orders if inactive for 3 months)
  useEffect(() => {
    if (user && user.role === 'user') {
      const cleanupOrders = async () => {
        try {
          const now = Date.now();
          const threeMonthsInMs = 90 * 24 * 60 * 60 * 1000;
          
          // If user hasn't been active for 3 months, clear their history
          // Only cleanup if it's a real user (not a manual bill/walk-in)
          if (user.lastActiveAt && (now - user.lastActiveAt) > threeMonthsInMs && user.uid) {
            const userId = user.uid;
            if (!userId) return;

            const qAllOrders = query(
              collection(db, 'orders'), 
              where('userId', '==', userId)
            );
            const snapshot = await getDocs(qAllOrders);
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
          }

          // Update last active timestamp
          await updateDoc(doc(db, 'users', user.uid), { lastActiveAt: now });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'users');
        }
      };
      cleanupOrders();
    }
  }, [user?.uid]);

  // Real-time Coupons Listener (Public)
  useEffect(() => {
    const qCoupons = query(collection(db, 'coupons'));
    const unsubscribeCoupons = onSnapshot(qCoupons, (snapshot) => {
      const newCoupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
      
      // Notify customer of new coupons (only if logged in)
      if (user && coupons.length > 0 && newCoupons.length > coupons.length) {
        const latest = newCoupons.sort((a, b) => (b.expiryDate || 0) - (a.expiryDate || 0))[0];
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Coupon Created!", {
            body: `Use code ${latest.code} to get a discount!`,
            icon: "/logo.png"
          });
        }
      }
      
      setCoupons(newCoupons);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'coupons', false);
    });
    return () => unsubscribeCoupons();
  }, [user]);

  // Real-time Orders Listener (Scoped to user or admin)
  useEffect(() => {
    if (!isAuthReady || !user) {
      setOrders([]);
      return;
    }

    let q;
    if (user.role === 'admin') {
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      const userId = user.uid;
      if (!userId) {
        setOrders([]);
        return;
      }
      q = query(collection(db, 'orders'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(orderList);

      // Admin Notification for NEW orders
      if (user?.role === 'admin') {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const order = change.doc.data() as Order;
            if (Date.now() - order.createdAt < 5000) {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(() => {});
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("New Order Received!", {
                  body: `Order #${change.doc.id.slice(-6).toUpperCase()} for ₹${order.total}`,
                  icon: "/logo.png"
                });
              }
              
              // WhatsApp Notification to Admins
              const adminNumbers = ['9905516803', '9608123427', '6205284423'];
              const msg = `New Order Received!%0AOrder ID: ${order.id}%0ATotal: ₹${order.total}%0AMethod: ${order.paymentMethod}%0ADelivery: ${order.deliveryType}`;
              adminNumbers.forEach(num => {
                // In a real app, this would be a server-side API call. 
                // Here we just log it or open one if it's the first time.
                console.log(`Notifying admin ${num}: ${msg}`);
              });
            }
          }
        });
      } else {
        // Customer Notification for status changes
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const order = change.doc.data() as Order;
            const oldOrder = ordersRef.current.find(o => o.id === change.doc.id);
            if (oldOrder && oldOrder.status !== order.status) {
              if ("Notification" in window && Notification.permission === "granted") {
                let title = "Order Update";
                let body = `Your order #${change.doc.id.slice(-6).toUpperCase()} is now ${order.status}!`;
                
                if (order.status === 'Pending') {
                  title = "Order Placed";
                  body = `Your order #${change.doc.id.slice(-6).toUpperCase()} has been placed successfully!`;
                } else if (order.status === 'Delivered') {
                  title = "Order Delivered";
                  body = `Your order #${change.doc.id.slice(-6).toUpperCase()} has been delivered. Enjoy!`;
                }

                new Notification(title, { body, icon: "/logo.png" });
              }
            }
          }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders', false);
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  const addToCart = (product: Product, quantity: number = 1, redirectToCheckout: boolean = false) => {
    // Determine the price to use (Regular Price vs Party Price)
    let finalPrice = product.price;
    if (user && user.customPrices && user.customPrices[product.id]) {
      finalPrice = user.customPrices[product.id];
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        if (newQuantity <= 0) {
          return prev.filter(item => item.id !== product.id);
        }
        return prev.map(item => (item.id === product.id) 
          ? { ...item, quantity: newQuantity, price: finalPrice } 
          : item);
      }
      if (quantity <= 0) return prev;
      return [...prev, { ...product, quantity, price: finalPrice }];
    });
    
    // Show notification only if we're adding
    if (quantity > 0) {
      setCartNotification({ show: true, productName: product.name });
      setTimeout(() => setCartNotification(null), 3000);
    }

    if (redirectToCheckout) {
      // Small delay to allow state to settle
      setTimeout(() => {
        window.location.href = '/checkout';
      }, 100);
    }
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  if (!isAuthReady || showSplash) {
    return (
      <AnimatePresence 
        onExitComplete={() => {
          sessionStorage.setItem('splashShown', 'true');
        }}
      >
        <LoadingScreen key="splash" onComplete={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <AppContent 
        cart={cart} 
        setCart={setCart}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        user={user}
        setUser={setUser}
        products={products}
        orders={orders}
        coupons={coupons}
        banners={banners}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        storeSettings={storeSettings}
        toggleWishlist={toggleWishlist}
        addToCart={addToCart}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        cartNotification={cartNotification}
        showBackToTop={showBackToTop}
      />
    </Router>
  );
}

function AppContent({ 
  cart, setCart, isCartOpen, setIsCartOpen, user, setUser, products, orders, coupons, banners, 
  searchQuery, setSearchQuery, storeSettings, toggleWishlist, addToCart, updateCartQuantity, removeFromCart,
  cartNotification, showBackToTop
}: any) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestedProductName, setRequestedProductName] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleClearCart = () => setCart([]);

  // Login Prompt Logic
  useEffect(() => {
    if (user === undefined) return; // Wait for auth to be determined
    if (!user) {
      const hidePrompt = localStorage.getItem('hideLoginPrompt');
      if (!hidePrompt) {
        const timer = setTimeout(() => setShowLoginPrompt(true), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  // Onboarding Logic
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleVoiceAddToCart = (productName: string) => {
    if (!productName) return false;
    const product = products.find((p: Product) => p.name.toLowerCase().includes(productName.toLowerCase()));
    if (product) {
      addToCart(product);
      return true;
    }
    return false;
  };

  const handleVoicePlaceOrder = () => {
    navigate('/checkout');
  };

  const handleVoiceSearch = (query: string) => {
    setSearchQuery(query);
    navigate('/items');
  };

  const queryParams = new URLSearchParams(location.search);
  const requestParam = queryParams.get('request');

  useEffect(() => {
    if (requestParam) {
      setRequestedProductName(decodeURIComponent(requestParam));
      setIsRequestModalOpen(true);
      // Clear the query param from URL without refreshing
      window.history.replaceState({}, '', location.pathname);
    }
  }, [requestParam, location.pathname]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-primary/20 selection:text-primary relative">
      {/* FMCG Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
      
      <Navbar 
        cartCount={cart.reduce((sum: number, item: any) => sum + item.quantity, 0)} 
        user={user} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        products={products}
        storeSettings={storeSettings}
        onAddToCart={addToCart}
      />
      
      <StoreStatusBanner settings={storeSettings} user={user} />
      
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home products={products} onAddToCart={addToCart} banners={banners} storeSettings={storeSettings} cart={cart} />} />
            <Route path="/products" element={<Products products={products} onAddToCart={addToCart} cart={cart} onUpdateQuantity={updateCartQuantity} onRemoveFromCart={removeFromCart} toggleWishlist={toggleWishlist} wishlist={user?.wishlist || []} storeSettings={storeSettings} />} />
            <Route path="/items" element={<Items products={products} onAddToCart={addToCart} cart={cart} onUpdateQuantity={updateCartQuantity} onRemoveFromCart={removeFromCart} toggleWishlist={toggleWishlist} wishlist={user?.wishlist || []} storeSettings={storeSettings} />} />
            <Route path="/product/:id" element={<ProductDetail products={products} onAddToCart={addToCart} toggleWishlist={toggleWishlist} wishlist={user?.wishlist || []} user={user} storeSettings={storeSettings} />} />
            <Route path="/categories" element={<Categories 
              products={products} 
              onAddToCart={addToCart} 
              cart={cart}
              onRemoveFromCart={removeFromCart}
              toggleWishlist={toggleWishlist}
              wishlist={user?.wishlist || []}
            />} />
            <Route path="/wishlist" element={user ? <Wishlist products={products} wishlist={user.wishlist || []} onAddToCart={addToCart} toggleWishlist={toggleWishlist} /> : <Navigate to="/login" />} />
            <Route path="/bulk-enquiry" element={user ? <BulkEnquiryPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/addresses" element={user ? <AddressesPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/help" element={<HelpSupportPage user={user} orders={orders} />} />
            <Route path="/photo-bill" element={<PhotoBillPage products={products} user={user} onAddToCart={addToCart} />} />
            <Route path="/bill" element={<BillPage products={products} onAddItems={(items) => {
              items.forEach(({ product, quantity }) => {
                addToCart(product, quantity);
              });
            }} />} />
            <Route path="/cart" element={<Cart cart={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onClearCart={handleClearCart} products={products} onAddToCart={addToCart} storeSettings={storeSettings} user={user} />} />
            <Route path="/checkout" element={<Checkout cart={cart} user={user} coupons={coupons} storeSettings={storeSettings} onOrderPlaced={async (order: any) => {
              try {
                await setDoc(doc(db, 'orders', order.id), order);
                setCart([]); // Clear cart after successful order
                navigate('/orders'); // Redirect to My Orders after placing order
              } catch (e) {
                console.error("Order creation failed", e);
              }
            }} />} />
            <Route path="/profile" element={user ? <Profile user={user} orders={orders} /> : <Navigate to="/login" />} />
            <Route path="/orders" element={user ? <MyOrders orders={orders} user={user} /> : <Navigate to="/login" />} />
             <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
            <Route path="/admin" element={<Admin products={products} orders={orders} coupons={coupons} banners={banners} user={user} />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/login" element={<Login onLogin={(u: any) => setUser(u)} />} />
            <Route path="/register" element={<Register onRegister={(u: any) => setUser(u)} />} />
          </Routes>
        </AnimatePresence>
      </main>

      <Footer />
      
      <VoiceAssistant 
        onAddToCart={handleVoiceAddToCart}
        onPlaceOrder={handleVoicePlaceOrder}
        onSearch={handleVoiceSearch}
        user={user || undefined}
        cart={cart}
      />

      <LoginPromptModal 
        isOpen={showLoginPrompt} 
        onClose={() => setShowLoginPrompt(false)} 
      />
      <LanguagePromptModal />

      <AnimatePresence>
        {showIntro && (
          <IntroVideoModal onClose={() => setShowIntro(false)} />
        )}
      </AnimatePresence>
      
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cart} 
        products={products}
        onUpdateQuantity={updateCartQuantity} 
        onRemove={removeFromCart}
        onAddItems={(items) => {
          items.forEach(({ product, quantity }) => {
            addToCart(product, quantity);
          });
        }}
        onCheckout={() => {
          setIsCartOpen(false);
          navigate('/checkout');
        }}
      />

      <ProductRequestModal 
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        initialProductName={requestedProductName}
      />
    </div>
  );
}
