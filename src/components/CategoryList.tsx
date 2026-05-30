import React from 'react';
import { CATEGORIES } from '../constants';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';

interface CategoryListProps {
  selectedCategory?: string;
  onSelect: (id: string) => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({ selectedCategory, onSelect }) => {
  return (
    <div className="flex items-center gap-4 overflow-x-auto pb-6 px-2 scrollbar-hide">
      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect('')}
        className={`flex flex-col items-center gap-3 min-w-[76px] md:min-w-[90px] p-3 rounded-2xl transition-all duration-300 border ${
          !selectedCategory ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
        }`}
      >
        <div className={`p-2.5 rounded-xl transition-all ${!selectedCategory ? 'bg-white/15' : 'bg-gray-50'}`}>
          <Icons.LayoutGrid className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider">All</span>
      </motion.button>
      
      {CATEGORIES.map((cat) => {
        const Icon = (Icons as any)[cat.icon] || Icons.Package;
        const isSelected = selectedCategory === cat.id;
        
        return (
          <motion.button 
            key={cat.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(cat.id)}
            className={`flex flex-col items-center gap-3 min-w-[76px] md:min-w-[90px] p-3 rounded-2xl transition-all duration-300 border ${
              isSelected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className={`p-2.5 rounded-xl transition-all ${isSelected ? 'bg-white/15' : 'bg-gray-50'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">{cat.name.split(' ')[0]}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
