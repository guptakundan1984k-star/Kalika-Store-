import React from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { Product, Banner, StoreSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MapPin, Clock, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';

interface HomeProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  banners: Banner[];
  storeSettings?: StoreSettings | null;
}

const Home: React.FC<HomeProps> = ({ products, onAddToCart, banners, storeSettings }) => {
  const activeBanners = banners.filter(b => b.active);
  const [currentBanner, setCurrentBanner] = React.useState(0);

  React.useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % activeBanners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  return (
    <div className="pb-24">
      {/* FMCG Hero Section - Now at the top */}
      <section className="px-4 md:px-6 max-w-7xl mx-auto mt-8">
        <div className="relative h-[300px] md:h-[400px] rounded-[50px] overflow-hidden bg-gray-900 shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1601599561213-832382fd07ba?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                Kalika <span className="text-primary">Store</span>
              </h1>
              
              {storeSettings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${
                    storeSettings.isOpen 
                      ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full animate-pulse ${storeSettings.isOpen ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Store is {storeSettings.isOpen ? 'Open' : 'Closed'}
                  </span>
                </motion.div>
              )}

              <p className="text-gray-300 font-black uppercase tracking-[0.4em] text-xs md:text-sm">
                Authentic Indian Grocery & Essentials
              </p>
              <div className="flex items-center justify-center gap-4 pt-4">
                <div className="w-12 h-1 bg-primary rounded-full" />
                <div className="w-2 h-1 bg-white/20 rounded-full" />
                <div className="w-2 h-1 bg-white/20 rounded-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Banners Carousel - Displayed below Kalika Store only if active banners exist */}
      {activeBanners.length > 0 && (
        <section className="px-4 md:px-6 max-w-7xl mx-auto mt-8">
          <div className="relative h-[180px] md:h-[350px] rounded-[40px] overflow-hidden shadow-2xl shadow-primary/10 border-4 border-white group">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeBanners[currentBanner].id}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="absolute inset-0"
              >
                <img 
                  src={activeBanners[currentBanner].image} 
                  alt={activeBanners[currentBanner].title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent flex flex-col justify-center p-8 md:p-16">
                  <motion.h3 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl md:text-5xl font-black text-white tracking-tight max-w-md leading-tight"
                  >
                    {activeBanners[currentBanner].title}
                  </motion.h3>
                  {activeBanners[currentBanner].link && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-6"
                    >
                      <Link 
                        to={activeBanners[currentBanner].link!}
                        className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl"
                      >
                        Shop Now <ArrowRight className="w-4 h-4" />
                      </Link>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Banner Indicators */}
            {activeBanners.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {activeBanners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentBanner(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      currentBanner === i ? 'w-8 bg-white' : 'w-2 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-12 mt-8">
        {/* Featured Products */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Popular Items
            </h2>
            <Link to="/categories" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
              Shop by Category <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {products.slice(0, 12).map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={onAddToCart} 
                onRemoveFromCart={() => {}} 
              />
            ))}
          </div>
        </section>

        {/* Store Info Section */}
        <section className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Visit Our Store</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Find us in Ranchi, Jharkhand</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-sm font-bold text-gray-900">opp. Krishi Market beside hotel white House, Ranchi, Jharkhand</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <p className="text-xs text-gray-500 font-medium">
                      Open 7 days a week: {storeSettings?.openingTime || '8:00 AM'} - {storeSettings?.closingTime || '9:00 PM'}
                    </p>
                  </div>
                  {!storeSettings?.isOpen && (
                    <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 rounded-xl text-red-500 border border-red-100">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                        {storeSettings?.message || "We are currently closed. You can pre-browse items."}
                      </p>
                    </div>
                  )}
                </div>
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=23.3884631,85.2795441" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                >
                  Get Directions <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="flex-1 h-[300px] rounded-[32px] overflow-hidden border border-gray-100 shadow-inner relative group">
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
