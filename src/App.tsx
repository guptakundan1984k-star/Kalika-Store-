import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { LoadingScreen } from './components/LoadingScreen';
import { VoiceAssistant } from './components/VoiceAssistant';
import ScrollToTop from './components/ScrollToTop';
import { Product, CartItem, UserProfile, Order, Coupon, Banner, StoreSettings, WalletTransaction } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShoppingBag, ArrowUp, X } from 'lucide-react';

// Firebase
import { 
  auth, db, onAuthStateChanged, collection, doc, 
  onSnapshot, query, where, orderBy, setDoc, getDoc, updateDoc, deleteDoc, getDocs,
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
import CS from './pages/CS';
import Topup from './pages/Topup';
import { SearchResults } from './pages/SearchResults';
import { ProductRequestModal } from './components/ProductRequestModal';
import { LoginPromptModal } from './components/LoginPromptModal';
import { StoreStatusBanner } from './components/StoreStatusBanner';
import { LanguagePromptModal } from './components/LanguagePromptModal';
import { BonusBanner } from './components/BonusBanner';

import { useStore } from './contexts/StoreContext';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

function AppContent() {
  const { setUser: setContextUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('LocalStorage not available for cart persistence');
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem('splashShown') !== 'true';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    // Safety timeout: Ensure app loads after 3 seconds even if auth state is delayed
    const timer = setTimeout(() => {
      if (!isAuthReady) {
        console.warn("Auth state delayed, forcing ready state for UX.");
        setIsAuthReady(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isAuthReady]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartNotification, setCartNotification] = useState<{ show: boolean, productName: string } | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestedProductName, setRequestedProductName] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [newTransaction, setNewTransaction] = useState<any>(null);
  const [lastTransactionCount, setLastTransactionCount] = useState<number | null>(null);

  const ordersRef = React.useRef<Order[]>([]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  useEffect(() => {
    const handleScroll = () => { setShowBackToTop(window.scrollY > 400); };
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => { 
    try {
      localStorage.setItem('cart', JSON.stringify(cart)); 
    } catch (e) { /* ignore */ }
  }, [cart]);

  const toggleWishlist = async (productId: string) => {
    if (!user) return;
    const currentWishlist = user.wishlist || [];
    const newWishlist = currentWishlist.includes(productId)
      ? currentWishlist.filter(id => id !== productId)
      : [...currentWishlist, productId];
    try {
      await updateDoc(doc(db, 'users', user.uid), { wishlist: newWishlist });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const addToCart = (product: Product, quantity: number = 1, redirectToCheckout: boolean = false, selectedUnit?: string) => {
    let finalPrice = product.price;
    if (user && user.customPrices && user.customPrices[product.id]) {
      finalPrice = user.customPrices[product.id];
    }
    
    let isAlreadyInCart = false;
    setCart(prev => {
      // Find item with same ID AND same Unit
      const existingIndex = prev.findIndex(item => item.id === product.id && item.selectedUnit === selectedUnit);
      
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        isAlreadyInCart = true;
        const newQuantity = existing.quantity + quantity;
        if (newQuantity <= 0) return prev.filter((_, i) => i !== existingIndex);
        
        const newCart = [...prev];
        newCart[existingIndex] = { ...existing, quantity: newQuantity, price: finalPrice };
        return newCart;
      }
      
      if (quantity <= 0) return prev;
      return [...prev, { ...product, quantity, price: finalPrice, selectedUnit }];
    });

    if (isAlreadyInCart && quantity > 0) {
      // Notification handled below, don't alert to avoid bad UX
    } else if (quantity > 0) {
      setCartNotification({ show: true, productName: product.name });
      setTimeout(() => setCartNotification(null), 3000);
    }
    
    if (redirectToCheckout) setTimeout(() => navigate('/checkout'), 100);
  };

  const handleClearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
  };

  const updateCartQuantity = (id: string, delta: number, selectedUnit?: string) => {
    setCart(prev => prev.map(item => (item.id === id && item.selectedUnit === selectedUnit) ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string, selectedUnit?: string) => setCart(prev => prev.filter(item => !(item.id === id && item.selectedUnit === selectedUnit)));

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeProfile) { unsubscribeProfile(); unsubscribeProfile = null; }
      if (firebaseUser) {
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          const isAdmin = ['kalikastore.info@gmail.com', 'guptakundan1984k@gmail.com', 'anshgupta4525@gmail.com'].includes(firebaseUser.email || '') ||
                         ['u0wqoiZcqsVrIbCjwI2osKeRLZo1', 'yaOovg7opUSgrQbsJ6abztHuOV03'].includes(firebaseUser.uid) ||
                         ['+919608123427', '+916205284423', '+919905516803'].includes(firebaseUser.phoneNumber || '');
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            if (isAdmin && userData.role !== 'admin') await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
            setUser(userData);
            setContextUser(userData);
          } else {
            const newUser: UserProfile = { uid: firebaseUser.uid, name: firebaseUser.displayName || 'Guest', email: firebaseUser.email || '', phone: firebaseUser.phoneNumber || '', role: isAdmin ? 'admin' : 'user', address: '', wishlist: [] };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setContextUser(newUser);
          }
        }, (error) => handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`, false));
      } else {
        setUser(null);
        setContextUser(null);
      }
      setIsAuthReady(true);
    });
    return () => { unsubscribeAuth(); if (unsubscribeProfile) unsubscribeProfile(); };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products', false));
    return () => unsubscribe();
  }, []);

  // Real-time Banners & Store Settings & Coupons...
  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'banners')), (snapshot) => {
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'banners', false));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let checkInterval: any;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        const update = () => {
          const now = new Date();
          const day = now.getDay();
          const mins = now.getHours() * 60 + now.getMinutes();
          const parse = (s: string) => { if (!s) return 0; const [h, m] = s.split(':').map(Number); return h * 60 + m; };
          let openSched = true;
          if (data.autoSchedule) {
            const o = parse(day === 0 ? data.sundayOpeningTime || '10:40' : data.openingTime || '10:40');
            const c = parse(day === 0 ? data.sundayClosingTime || '15:00' : data.closingTime || '20:00');
            openSched = mins >= o && mins < c;
          }
          const ready = data.isOpen && (!data.autoSchedule || openSched);
          let msg = data.message;
          if (data.isOpen && data.autoSchedule && !openSched) {
            msg = `Currently accepting Pre-orders for ${day === 0 ? 'Monday' : 'Next Day'}.`;
          }
          setStoreSettings({ ...data, isFunctionallyOpen: ready, message: msg || data.message });
        };
        update();
        if (checkInterval) clearInterval(checkInterval);
        checkInterval = setInterval(update, 60000);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/store', false));
    return () => { unsubscribe(); if (checkInterval) clearInterval(checkInterval); };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'coupons')), (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Coupon)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'coupons', false));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) { setOrders([]); return; }
    const q = (user.role === 'admin' || user.role === 'cs') ? query(collection(db, 'orders'), orderBy('createdAt', 'desc')) : query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders', false));
    return () => unsubscribe();
  }, [isAuthReady, user]);

  const handleVoiceAddToCart = (productName: string, quantity: number = 1, productId?: string) => {
    if (!productName && !productId) return false;
    
    let product: Product | undefined;
    if (productId) {
      product = products.find(p => p.id === productId);
    } else {
      product = products.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
    }

    if (product) {
      addToCart(product, quantity);
      return true;
    }
    return false;
  };
  const handleVoicePlaceOrder = () => navigate('/checkout');
  const handleVoiceSearch = (s: string) => { setSearchQuery(s); navigate('/products'); };

  useEffect(() => {
    const p = new URLSearchParams(location.search).get('request');
    if (p) { setRequestedProductName(decodeURIComponent(p)); setIsRequestModalOpen(true); window.history.replaceState({}, '', location.pathname); }
  }, [location.pathname]);

  // Removed disruptive visibility-change back-navigation

  if (!isAuthReady || showSplash) return <LoadingScreen onComplete={() => { setShowSplash(false); sessionStorage.setItem('splashShown', 'true'); }} />;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-primary/20 selection:text-primary relative">
      <div className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 bg-gray-50" />
      <Navbar 
        cartCount={new Set(cart.map(item => item.name)).size} 
        user={user} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        products={products} 
        storeSettings={storeSettings} 
        onAddToCart={addToCart} 
        onCartOpen={() => setIsCartOpen(true)} 
      />
      {user && <BonusBanner user={user} />}
      <StoreStatusBanner settings={storeSettings} user={user} />
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home products={products} onAddToCart={addToCart} banners={banners} storeSettings={storeSettings} cart={cart} toggleWishlist={toggleWishlist} wishlist={user?.wishlist || []} />} />
            <Route path="/products" element={<Products products={products} onAddToCart={addToCart} cart={cart} onUpdateQuantity={updateCartQuantity} onRemoveFromCart={removeFromCart} toggleWishlist={toggleWishlist} wishlist={user?.wishlist || []} storeSettings={storeSettings} />} />
            <Route path="/items" element={<Items products={products} onAddToCart={addToCart} cart={cart} onUpdateQuantity={updateCartQuantity} onRemoveFromCart={removeFromCart} toggleWishlist={toggleWishlist} wishlist={user?.wishlist || []} storeSettings={storeSettings} />} />
            <Route path="/product/:id" element={<ProductDetail products={products} onAddToCart={addToCart} toggleWishlist={toggleWishlist} wishlist={user?.wishlist || []} user={user} storeSettings={storeSettings} />} />
            <Route path="/categories" element={<Categories products={products} onAddToCart={addToCart} cart={cart} onRemoveFromCart={removeFromCart} toggleWishlist={toggleWishlist} wishlist={user?.wishlist || []} />} />
            <Route path="/wishlist" element={user ? <Wishlist products={products} wishlist={user.wishlist || []} onAddToCart={addToCart} toggleWishlist={toggleWishlist} /> : <Navigate to="/login" />} />
            <Route path="/bulk-enquiry" element={user ? <BulkEnquiryPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/addresses" element={user ? <AddressesPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/help" element={<HelpSupportPage user={user} orders={orders} />} />
            <Route path="/photo-bill" element={<PhotoBillPage products={products} user={user} onAddToCart={addToCart} />} />
            <Route path="/bill" element={<BillPage products={products} onAddItems={(items) => { items.forEach(({ product, quantity }) => addToCart(product, quantity)); }} />} />
            <Route path="/cart" element={<Cart cart={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onClearCart={handleClearCart} products={products} onAddToCart={addToCart} storeSettings={storeSettings} user={user} />} />
            <Route path="/checkout" element={<Checkout cart={cart} user={user} coupons={coupons} storeSettings={storeSettings} onOrderPlaced={async (order: any) => { try { await setDoc(doc(db, 'orders', order.id), order); setCart([]); navigate('/orders'); } catch (e) { console.error(e); } }} />} />
            <Route path="/profile" element={user ? <Profile user={user} orders={orders} /> : <Navigate to="/login" />} />
            <Route path="/orders" element={user ? <MyOrders orders={orders} user={user} /> : <Navigate to="/login" />} />
            <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
            <Route path="/search" element={<SearchResults products={products} onAddToCart={addToCart} />} />
            <Route path="/admin" element={<Admin products={products} orders={orders} coupons={coupons} banners={banners} user={user} />} />
            <Route path="/cs" element={<CS products={products} orders={orders} user={user} />} />
            <Route path="/topup" element={<Topup user={user} />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/login" element={<Login onLogin={(u: any) => setUser(u)} />} />
            <Route path="/register" element={<Register onRegister={(u: any) => setUser(u)} />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      <AnimatePresence>
        {cartNotification?.show && (
          <motion.div initial={{ opacity: 0, y: 100, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 100, scale: 0.9 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xs">
            <div className="bg-gray-900 text-white px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-3 border border-white/10">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-white" /></div>
              <p className="text-sm font-black tracking-tight">{cartNotification.productName} added to cart!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <VoiceAssistant 
        onAddToCart={handleVoiceAddToCart} 
        onPlaceOrder={handleVoicePlaceOrder} 
        onSearch={handleVoiceSearch} 
        onLogout={async () => { try { await auth.signOut(); navigate('/login'); } catch (e) { console.error(e); } }} 
        user={user || undefined} 
        cart={cart} 
        products={products}
      />
      <LoginPromptModal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
      <LanguagePromptModal />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cart} products={products} user={user} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onClear={handleClearCart} onAddItems={(items) => { items.forEach(({ product, quantity }) => addToCart(product, quantity)); }} onCheckout={() => { setIsCartOpen(false); navigate('/checkout'); }} />
      <ProductRequestModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} initialProductName={requestedProductName} />
      {showBackToTop && (
        <motion.button initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-24 right-8 z-50 bg-gray-900 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all border border-white/20">
          <ArrowUp className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
}
