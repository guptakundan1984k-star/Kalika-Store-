import React from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

interface SearchProps {
  value: string;
  onChange: (val: string) => void;
}

export const Search: React.FC<SearchProps> = ({ value, onChange }) => {
  return (
    <div className="relative w-full max-w-2xl mx-auto group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
        <SearchIcon className="w-6 h-6" />
      </div>
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for fresh fruits, dairy, staples..."
        className="w-full bg-white border border-gray-100 rounded-3xl py-5 pl-14 pr-14 text-lg font-medium shadow-xl shadow-gray-200/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-gray-300"
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {value && (
          <button 
            onClick={() => onChange('')}
            className="p-2 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
