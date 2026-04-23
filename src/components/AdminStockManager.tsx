import React from 'react';
import { Package, AlertTriangle, CheckCircle2, Search, ArrowUpDown } from 'lucide-react';
import { Product } from '../types';
import { motion } from 'motion/react';

interface AdminStockManagerProps {
  products: Product[];
  onUpdateStock: (id: string, stock: number) => void;
}

export const AdminStockManager: React.FC<AdminStockManagerProps> = ({ products, onUpdateStock }) => {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'low' | 'out'>('all');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (filter === 'low') return matchesSearch && p.stock > 0 && p.stock <= 5;
    if (filter === 'out') return matchesSearch && p.stock === 0;
    return matchesSearch;
  });

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Stock Control</h2>
          <p className="text-sm text-gray-500 font-medium">Monitor and update inventory levels in real-time.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          {(['all', 'low', 'out'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                filter === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Stock</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Quick Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 tracking-tight">{product.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-black ${product.stock <= 5 ? 'text-red-500' : 'text-gray-900'}`}>
                        {product.stock}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {product.stock === 0 ? (
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <AlertTriangle className="w-3 h-3" />
                        Out of Stock
                      </span>
                    ) : product.stock <= 5 ? (
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <AlertTriangle className="w-3 h-3" />
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 className="w-3 h-3" />
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onUpdateStock(product.id, Math.max(0, product.stock - 10))}
                        className="p-2 bg-gray-50 text-gray-400 hover:text-red-500 rounded-xl transition-all active:scale-95"
                      >
                        -10
                      </button>
                      <button 
                        onClick={() => onUpdateStock(product.id, product.stock + 10)}
                        className="p-2 bg-gray-50 text-gray-400 hover:text-green-500 rounded-xl transition-all active:scale-95"
                      >
                        +10
                      </button>
                      <button 
                        onClick={() => onUpdateStock(product.id, product.stock + 50)}
                        className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all active:scale-95"
                      >
                        +50
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
