import React, { useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Package, Filter, Download, 
  Upload, Image as ImageIcon, Sparkles, Loader2, AlertCircle, Save, X,
  CheckSquare, Square, Cloud
} from 'lucide-react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { generateProductDescription, analyzeProductImage, searchProductDetails } from '../services/geminiService';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db, doc, deleteDoc, updateDoc, storage, ref, uploadBytes, getDownloadURL, handleFirestoreError, OperationType } from '../firebase';

interface AdminProductManagerProps {
  products: Product[];
  onAdd: (product: Partial<Product>) => void;
  onBulkAdd?: (products: Partial<Product>[]) => Promise<void>;
  onUpdate: (id: string, product: Partial<Product>) => void;
  onDelete: (id: string) => void;
}

export const AdminProductManager: React.FC<AdminProductManagerProps> = ({ products, onAdd, onBulkAdd, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [searchingGoogle, setSearchingGoogle] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 'Vegetables',
    stock: 0,
    description: '',
    image: '',
    weight: ''
  });
  const [bulkStockValue, setBulkStockValue] = useState<number>(0);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categories, setCategories] = useState(['Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Meat', 'Snacks', 'Beverages', 'Staples', 'Oils', 'Household']);

  const handleBulkSync = async (type: 'images' | 'descriptions' | 'all') => {
    const productsToSync = products.filter(p => {
      const isPlaceholder = !p.image || p.image.includes('picsum.photos') || p.image.includes('placeholder');
      const needsImage = isPlaceholder;
      const needsDesc = !p.description || p.description.length < 20;
      if (type === 'images') return needsImage;
      if (type === 'descriptions') return needsDesc;
      return needsImage || needsDesc;
    });

    if (productsToSync.length === 0) {
      alert("All products have real images and descriptions! If you want to force updates, please edit them individualy.");
      return;
    }

    if (!window.confirm(`Found ${productsToSync.length} products needing ${type}. Sync them using Google Search & AI? This will fetch real product photos.`)) return;

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: productsToSync.length });

    let successCount = 0;
    for (let i = 0; i < productsToSync.length; i++) {
      const product = productsToSync[i];
      setSyncProgress({ current: i + 1, total: productsToSync.length });

      try {
        const details = await searchProductDetails(product.name);
        const updates: any = {};
        
        if ((type === 'images' || type === 'all') && details.imageUrl?.startsWith('http')) {
          updates.image = details.imageUrl;
        }
        
        if ((type === 'descriptions' || type === 'all') && details.description) {
          updates.description = details.description;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'products', product.id), updates);
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to sync ${product.name}:`, error);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsSyncing(false);
    alert(`Successfully synced ${successCount} products.`);
  };

  const handleAddCategory = () => {
    if (newCategoryName && !categories.includes(newCategoryName)) {
      setCategories(prev => [...prev, newCategoryName]);
      setEditingProduct(prev => ({ ...prev, category: newCategoryName }));
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'products', id))));
      setSelectedIds([]);
    } catch (e) {
      console.error("Bulk delete failed", e);
    }
  };

  const handleBulkStockUpdate = async (stock: number) => {
    try {
      await Promise.all(selectedIds.map(id => updateDoc(doc(db, 'products', id), { stock })));
      setSelectedIds([]);
      setBulkStockValue(0);
    } catch (e) {
      console.error("Bulk stock update failed", e);
    }
  };

  const handleBulkCategoryUpdate = async () => {
    const category = window.prompt("Enter new category for selected products:", categories[0]);
    if (!category) return;
    
    try {
      await Promise.all(selectedIds.map(id => updateDoc(doc(db, 'products', id), { category })));
      setSelectedIds([]);
      if (!categories.includes(category)) setCategories(prev => [...prev, category]);
    } catch (e) {
      console.error("Bulk category update failed", e);
    }
  };

  const handleAISuggest = async () => {
    if (!editingProduct.name) return;
    setLoadingAI(true);
    try {
      const desc = await generateProductDescription(editingProduct.name, editingProduct.category || '');
      setEditingProduct(prev => ({ 
        ...prev, 
        description: desc,
        image: prev.image || `https://picsum.photos/seed/${editingProduct.name.replace(/\s+/g, '-')}/800/800`
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleGoogleSearch = async () => {
    if (!editingProduct.name) return;
    setSearchingGoogle(true);
    try {
      const details = await searchProductDetails(editingProduct.name);
      setEditingProduct(prev => ({
        ...prev,
        description: details.description || prev.description,
        price: details.price || prev.price,
        category: details.category || prev.category,
        image: details.imageUrl?.startsWith('http') 
          ? details.imageUrl 
          : `https://picsum.photos/seed/${details.imageUrl || editingProduct.name}/800/800`
      }));
    } catch (error) {
      console.error("Google Search failed", error);
      alert("Failed to fetch details from Google. Please try again.");
    } finally {
      setSearchingGoogle(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingPhoto(true);
    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Analyze with Gemini
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const result = await analyzeProductImage(base64);
      if (result.name) {
        setEditingProduct(prev => ({
          ...prev,
          name: result.name,
          category: result.category || prev.category,
          price: result.price || prev.price,
          description: result.description || prev.description,
          image: downloadURL
        }));
      } else {
        setEditingProduct(prev => ({ ...prev, image: downloadURL }));
      }
    } catch (error) {
      console.error("Photo upload/analysis failed", error);
      alert("Failed to process photo. Please try again.");
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          processImportedData(results.data);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        processImportedData(data);
      };
      reader.readAsBinaryString(file);
    }
  };

  const processImportedData = async (data: any[]) => {
    setIsImporting(true);
    const newProducts: Partial<Product>[] = [];
    
    data.forEach((row: any) => {
      const name = row.name || row.ItemName || row.Name || row['Item Name'];
      if (name) {
        newProducts.push({
          name: name,
          price: parseFloat(row.price || row.SalePrice || row.Price || row['Sale Price']) || 0,
          purchasePrice: parseFloat(row.purchasePrice || row.PurchasePrice || row['Purchase Price']) || 0,
          category: row.category || row.Category || 'Staples',
          stock: parseInt(row.stock || row.Stock || row.Quantity || row['Item Stock quantity']) || 0,
          description: row.description || row.Description || '',
          image: row.image || row.Image || row['Product Photo Link'] || `https://picsum.photos/seed/${name.replace(/\s+/g, '-')}/800/800`,
          weight: row.weight || row.Weight || ''
        });
      }
    });

    try {
      if (onBulkAdd) {
        await onBulkAdd(newProducts);
      } else {
        for (const p of newProducts) {
          await onAdd(p);
        }
      }
      alert(`Successfully imported ${newProducts.length} items.`);
    } catch (e) {
      console.error("Import failed", e);
      alert("Failed to import some items. Check console for details.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleBulkImportDefault = async () => {
    if (window.confirm("This will add all items from the default catalog. Continue?")) {
      setIsImporting(true);
      try {
        if (onBulkAdd) {
          await onBulkAdd(INITIAL_PRODUCTS);
        } else {
          for (const product of INITIAL_PRODUCTS) {
            await onAdd(product);
          }
        }
        alert("Catalog imported successfully.");
      } catch (e) {
        console.error("Catalog import failed", e);
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleSave = () => {
    if (editingProduct.id) {
      onUpdate(editingProduct.id, editingProduct);
    } else {
      onAdd(editingProduct);
    }
    setIsEditing(false);
    setEditingProduct({
      name: '',
      price: 0,
      category: 'Vegetables',
      stock: 0,
      description: '',
      image: '',
      weight: ''
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Inventory Management</h2>
          <p className="text-sm text-gray-500 font-medium">Manage your products, stock levels, and pricing.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button 
              disabled={isSyncing}
              className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-3 rounded-2xl shadow-sm hover:bg-primary hover:text-white transition-all font-bold text-sm disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isSyncing ? `Syncing (${syncProgress.current}/${syncProgress.total})` : 'AI Sync'}
            </button>
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button onClick={() => handleBulkSync('images')} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors">Sync Images Only</button>
              <button onClick={() => handleBulkSync('descriptions')} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors">Sync Descriptions Only</button>
              <button onClick={() => handleBulkSync('all')} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors border-t border-gray-50 mt-1 pt-3">Sync Everything</button>
            </div>
          </div>
          <button 
            onClick={handleBulkImportDefault}
            disabled={isImporting}
            className="flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-3 rounded-2xl shadow-sm hover:bg-secondary hover:text-white transition-all font-bold text-sm disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isImporting ? 'Importing...' : 'Load Catalog'}
          </button>
          <label className={`flex items-center gap-2 bg-white border border-gray-100 px-4 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer text-sm font-bold text-gray-600 ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="w-5 h-5 text-primary" />
            Import XLS/CSV
            <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" disabled={isImporting} />
          </label>
          <button 
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-2xl shadow-sm hover:bg-red-600 hover:text-white transition-all font-bold text-sm disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
            Delete Selected
          </button>
          <button 
            onClick={async () => {
              if (window.confirm('⚠️ WARNING: This will delete ALL products from your store. This action cannot be undone. Are you absolutely sure?')) {
                if (window.confirm('FINAL CONFIRMATION: Type "DELETE ALL" (case sensitive) if you are sure.')) {
                  const confirmText = window.prompt('Type "DELETE ALL" to confirm:');
                  if (confirmText === 'DELETE ALL') {
                    setIsSyncing(true);
                    try {
                      const batch = products.map(p => deleteDoc(doc(db, 'products', p.id)));
                      await Promise.all(batch);
                      alert('All products deleted successfully.');
                    } catch (e) {
                      console.error("Delete all failed", e);
                    } finally {
                      setIsSyncing(false);
                    }
                  }
                }
              }
            }}
            disabled={products.length === 0 || isSyncing}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-3 rounded-2xl shadow-xl shadow-red-600/20 hover:bg-black transition-all font-black text-sm uppercase tracking-widest disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
            Remove All Items
          </button>
          <button 
            onClick={() => {
              setEditingProduct({ name: '', price: 0, category: 'Vegetables', stock: 0, description: '', image: '', weight: '' });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-bold"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {products.some(p => p.image?.includes('picsum.photos') || !p.image) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 p-4 rounded-3xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Professional Images Missing</p>
              <p className="text-xs text-gray-500">Some products are still using placeholder photos. Use AI Sync to find real official images.</p>
            </div>
          </div>
          <button 
            onClick={() => handleBulkSync('images')}
            className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
          >
            Enhance Photos Now
          </button>
        </motion.div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Products', value: products.length, icon: Package, color: 'primary' },
          { label: 'Low Stock', value: products.filter(p => p.stock <= 5).length, icon: AlertCircle, color: 'red' },
          { label: 'Categories', value: new Set(products.map(p => p.category)).size, icon: Filter, color: 'blue' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <div className={`w-12 h-12 bg-${stat.color === 'primary' ? 'primary' : stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color === 'primary' ? 'primary' : stat.color}-500 mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</h4>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-primary transition-colors">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-primary transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-20 left-0 right-0 bg-gray-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl z-[60]"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-black uppercase tracking-widest">{selectedIds.length} selected</span>
                <div className="h-4 w-px bg-white/20" />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/10 p-1 rounded-xl border border-white/10">
                    <input 
                      type="number" 
                      value={bulkStockValue}
                      onChange={(e) => setBulkStockValue(parseInt(e.target.value) || 0)}
                      className="w-16 bg-transparent border-none text-right text-xs font-black focus:ring-0 placeholder-white/30"
                      placeholder="Qty"
                    />
                    <button
                      onClick={() => handleBulkStockUpdate(bulkStockValue)}
                      className="px-3 py-1 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-primary-dark"
                    >
                      Update Stock
                    </button>
                  </div>
                  <div className="h-4 w-px bg-white/20" />
                  <button 
                    onClick={handleBulkCategoryUpdate}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                  >
                    Change Category
                  </button>
                  <div className="h-4 w-px bg-white/20" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkStockUpdate(0)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                      Quick: Out of Stock
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/10"
                >
                  Clear
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 w-10">
                  <button onClick={toggleSelectAll} className="p-1 text-gray-400 hover:text-primary transition-colors">
                    {selectedIds.length === filteredProducts.length ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                return (
                  <tr 
                    key={product.id} 
                    onDoubleClick={() => { setEditingProduct(product); setIsEditing(true); }}
                    className={`hover:bg-gray-50/50 transition-colors group cursor-pointer ${isSelected ? 'bg-primary/5' : ''} ${(!product.price || product.price <= 0) ? 'bg-red-50/30' : ''}`}
                    title="Double click to edit"
                  >
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(product.id)} className={`p-1 transition-colors ${isSelected ? 'text-primary' : 'text-gray-300'}`}>
                        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        <img 
                          src={product.image || `https://picsum.photos/seed/${product.id}/100/100`} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{product.name}</span>
                        <span className="text-[10px] text-gray-400 font-medium">ID: {product.id.slice(0, 8)}</span>
                        {(!product.price || product.price <= 0) && (
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                            <AlertCircle className="w-2 h-2" /> Price Missing
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg uppercase tracking-wider">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-gray-900">₹{product.price}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${product.stock <= 5 ? 'text-orange-500' : 'text-gray-700'}`}>
                      {product.stock} units
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                      {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => { setEditingProduct(product); setIsEditing(true); }}
                        aria-label={`Edit ${product.name}`}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(product.id)}
                        aria-label={`Delete ${product.name}`}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-gray-900 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">{editingProduct.id ? 'Edit Product' : 'Add New Product'}</h3>
                </div>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Product Photo (AI Analyze)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                        {analyzingPhoto ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Analyzing...</span>
                          </div>
                        ) : editingProduct.image ? (
                          <img src={editingProduct.image} alt="Preview" className="w-20 h-20 object-cover rounded-xl" />
                        ) : (
                          <div className="flex flex-col items-center">
                            <ImageIcon className="w-8 h-8 text-gray-300 group-hover:text-primary transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary mt-2">Click to upload photo</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Product Name</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                          placeholder="Enter product name"
                          aria-label="Product Name"
                        />
                        <button 
                          onClick={handleAISuggest}
                          disabled={loadingAI || !editingProduct.name}
                          className="bg-primary/10 text-primary p-3 rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                          title="AI Suggest Description"
                          aria-label="AI Suggest Description"
                        >
                          {loadingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        </button>
                        <button 
                          onClick={handleGoogleSearch}
                          disabled={searchingGoogle || !editingProduct.name}
                          className="bg-blue-50 text-blue-500 p-3 rounded-xl hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50"
                          title="Search Google for Details"
                          aria-label="Search Google for Details"
                        >
                          {searchingGoogle ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Category</label>
                        <button 
                          onClick={() => setIsAddingCategory(!isAddingCategory)}
                          className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                        >
                          {isAddingCategory ? 'Select Existing' : 'Add New'}
                        </button>
                      </div>
                      {isAddingCategory ? (
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="New category name"
                            className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                          />
                          <button 
                            onClick={handleAddCategory}
                            className="bg-primary text-white p-3 rounded-xl hover:bg-primary-dark transition-all"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <select 
                          value={editingProduct.category}
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                          aria-label="Category"
                        >
                          {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sale Price (₹)</label>
                      <input 
                        type="number" 
                        value={isNaN(editingProduct.price!) ? '' : editingProduct.price}
                        onChange={(e) => setEditingProduct(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                        aria-label="Price"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Original Price (₹)</label>
                      <input 
                        type="number" 
                        value={isNaN(editingProduct.originalPrice!) ? '' : editingProduct.originalPrice}
                        onChange={(e) => setEditingProduct(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) }))}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                        aria-label="Original Price"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stock</label>
                    <input 
                      type="number" 
                      value={isNaN(editingProduct.stock!) ? '' : editingProduct.stock}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, stock: parseInt(e.target.value) }))}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                      aria-label="Stock"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Weight / Volume</label>
                    <input 
                      type="text" 
                      value={editingProduct.weight}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, weight: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g. 500g, 1L"
                    />
                  </div>
                </div>

                {/* Variations Section */}
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 space-y-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Product Variations</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sizes (comma separated)</label>
                      <input 
                        type="text" 
                        value={editingProduct.variations?.sizes?.join(', ') || ''}
                        onChange={(e) => setEditingProduct(prev => ({ 
                          ...prev, 
                          variations: { ...prev.variations, sizes: e.target.value.split(',').map(s => s.trim()).filter(s => s) } 
                        }))}
                        className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                        placeholder="S, M, L, XL"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Colors (comma separated)</label>
                      <input 
                        type="text" 
                        value={editingProduct.variations?.colors?.join(', ') || ''}
                        onChange={(e) => setEditingProduct(prev => ({ 
                          ...prev, 
                          variations: { ...prev.variations, colors: e.target.value.split(',').map(s => s.trim()).filter(s => s) } 
                        }))}
                        className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                        placeholder="Red, Blue, Green"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Flavors (comma separated)</label>
                      <input 
                        type="text" 
                        value={editingProduct.variations?.flavors?.join(', ') || ''}
                        onChange={(e) => setEditingProduct(prev => ({ 
                          ...prev, 
                          variations: { ...prev.variations, flavors: e.target.value.split(',').map(s => s.trim()).filter(s => s) } 
                        }))}
                        className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                        placeholder="Vanilla, Chocolate"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Description</label>
                    <button 
                      onClick={handleAISuggest}
                      disabled={loadingAI || !editingProduct.name}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-wider"
                    >
                      {loadingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Generate
                    </button>
                  </div>
                  <textarea 
                    rows={4}
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 resize-none"
                    placeholder="Describe the product..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Image URL</label>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                      <Cloud className="w-3 h-3" />
                      Uses 5TB Gmail Storage
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editingProduct.image}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, image: e.target.value }))}
                      className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                      placeholder="https://..."
                    />
                    <label className="bg-primary/10 text-primary p-3 rounded-xl hover:bg-primary hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0">
                      {analyzingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    <button 
                      onClick={handleAISuggest}
                      className="bg-secondary/10 text-secondary p-3 rounded-xl hover:bg-secondary hover:text-white transition-all shrink-0"
                      title="AI Suggest Image"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-primary text-white px-8 py-3 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-bold flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Product
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
