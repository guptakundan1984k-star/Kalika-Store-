import React, { useRef, useState } from 'react';
import { Search as SearchIcon, X, ScanBarcode, Camera, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../services/aiService';

interface SearchProps {
  value: string;
  onChange: (val: string) => void;
}

export const Search: React.FC<SearchProps> = ({ value, onChange }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSearching(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const productName = await aiService.findProductByImage(base64, file.type);
      if (productName) {
        onChange(productName);
        navigate(`/items?q=${encodeURIComponent(productName)}`);
      }
    } catch (error) {
      console.error("Visual search error:", error);
      alert("AI Image search failed. Please try again.");
    } finally {
      setIsSearching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="relative w-full max-w-2xl mx-auto group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
        {isSearching ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <SearchIcon className="w-6 h-6" />}
      </div>
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSearching ? "Identifying product..." : "Search for grocery items..."}
        className="w-full bg-white border border-gray-100 rounded-3xl py-5 pl-14 pr-32 text-lg font-medium shadow-xl shadow-gray-200/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-gray-300"
        disabled={isSearching}
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {value && !isSearching && (
          <button 
            onClick={() => onChange('')}
            className="p-2 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          capture="environment"
          onChange={handleImageSearch}
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isSearching}
          className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-primary transition-all active:scale-95 shadow-sm"
          title="Search by Image"
        >
          <Camera className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate('/scan')}
          disabled={isSearching}
          className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-primary transition-all active:scale-95 shadow-sm"
          title="Scan Barcode"
        >
          <ScanBarcode className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
