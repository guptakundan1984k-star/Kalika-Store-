import React from 'react';
import { Sparkles, Box, Palette, Coffee, Search } from 'lucide-react';
import { Product } from '../types';
import { motion } from 'motion/react';

interface AdminVariationManagerProps {
  products: Product[];
}

export const AdminVariationManager: React.FC<AdminVariationManagerProps> = ({ products }) => {
  const [search, setSearch] = React.useState('');

  const productsWithVariations = products.filter(p => 
    p.variations?.sizes?.length || 
    p.variations?.colors?.length || 
    p.variations?.flavors?.length
  ).filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Product Variations</h2>
        <p className="text-sm text-gray-500 font-medium">Overview of all product sizes, colors, and flavors.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productsWithVariations.map((product) => (
          <motion.div 
            layout
            key={product.id}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-50">
                <img src={product.image || undefined} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-black text-gray-900 tracking-tight">{product.name}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.category}</p>
              </div>
            </div>

            <div className="space-y-4">
              {product.variations?.sizes?.length ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Box className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sizes</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.variations.sizes.map(s => (
                      <span key={s} className="px-3 py-1 bg-gray-50 rounded-lg text-xs font-bold text-gray-600 border border-gray-100">{s}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {product.variations?.colors?.length ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Palette className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Colors</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.variations.colors.map(c => (
                      <span key={c} className="px-3 py-1 bg-gray-50 rounded-lg text-xs font-bold text-gray-600 border border-gray-100">{c}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {product.variations?.flavors?.length ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Coffee className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Flavors</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.variations.flavors.map(f => (
                      <span key={f} className="px-3 py-1 bg-gray-50 rounded-lg text-xs font-bold text-gray-600 border border-gray-100">{f}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>

      {productsWithVariations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center text-gray-200">
            <Sparkles className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-gray-900">No variations found</h3>
            <p className="text-sm text-gray-500">Add variations to your products in the Inventory tab.</p>
          </div>
        </div>
      )}
    </div>
  );
};
