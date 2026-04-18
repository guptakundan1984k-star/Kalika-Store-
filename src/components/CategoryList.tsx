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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onSelect('')}
        className={`flex flex-col items-center gap-3 min-w-[80px] md:min-w-[100px] p-4 rounded-3xl transition-all duration-300 border ${
          !selectedCategory ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-white text-gray-500 border-gray-100 hover:border-primary/30 hover:bg-primary/5'
        }`}
      >
        <div className={`p-3 rounded-2xl transition-all ${!selectedCategory ? 'bg-white/20' : 'bg-gray-50'}`}>
          <Icons.LayoutGrid className="w-6 h-6" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest">All</span>
      </motion.button>
      
      {CATEGORIES.map((cat) => {
        const Icon = (Icons as any)[cat.icon] || Icons.Package;
        const isSelected = selectedCategory === cat.id;
        
        return (
          <motion.button 
            key={cat.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(cat.id)}
            className={`flex flex-col items-center gap-3 min-w-[80px] md:min-w-[100px] p-4 rounded-3xl transition-all duration-300 border ${
              isSelected ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-white text-gray-500 border-gray-100 hover:border-primary/30 hover:bg-primary/5'
            }`}
          >
            <div className={`p-3 rounded-2xl transition-all ${isSelected ? 'bg-white/20' : 'bg-gray-50'}`}>
              <Icon className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">{cat.name.split(' ')[0]}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
