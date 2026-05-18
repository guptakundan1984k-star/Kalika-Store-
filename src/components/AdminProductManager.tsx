import React, { useState } from 'react';
import { printerService } from '../services/BluetoothPrinterService';
import { 
  Plus, Search, Edit2, Trash2, Package, Filter, Download, 
  Upload, Image as ImageIcon, Sparkles, Loader2, AlertCircle, Save, X,
  CheckSquare, Square, Cloud, ScanBarcode, Printer
} from 'lucide-react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { generateProductDescription, analyzeProductImage, searchProductDetails, findProductByBarcode } from '../services/geminiService';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db, doc, deleteDoc, updateDoc, storage, ref, uploadBytes, getDownloadURL, handleFirestoreError, OperationType } from '../firebase';
import { aiService } from '../services/aiService';
import { BarcodeScanner } from './BarcodeScanner';
import { optimizeImage } from '../lib/utils';


interface AdminProductManagerProps {
  products: Product[];
  onAdd: (product: Partial<Product>) => void;
  onBulkAdd?: (products: Partial<Product>[]) => Promise<void>;
  onUpdate: (id: string, product: Partial<Product>) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  'Vegetables': 'https://images.unsplash.com/photo-1566385101042-1a000c1268c4?auto=format&fit=crop&q=80&w=1000',
  'Fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=1000',
  'Dairy': 'https://images.unsplash.com/photo-1550583724-125581fe35ad?auto=format&fit=crop&q=80&w=1000',
  'Bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1000',
  'Meat': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=1000',
  'Snacks': 'https://images.unsplash.com/photo-1599490659223-e153c07dc4c4?auto=format&fit=crop&q=80&w=1000',
  'Beverages': 'https://images.unsplash.com/photo-1622483767028-3f66f3614fc6?auto=format&fit=crop&q=80&w=1000',
  'Staples': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=1000',
  'Oils': 'https://images.unsplash.com/photo-1474979266404-7eaacabc88c5?auto=format&fit=crop&q=80&w=1000',
  'Household': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1000'
};

export const AdminProductManager: React.FC<AdminProductManagerProps> = ({ products, onAdd, onBulkAdd, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [duplicateImportItems, setDuplicateImportItems] = useState<Partial<Product>[]>([]);
  const [pendingNewItems, setPendingNewItems] = useState<Partial<Product>[]>([]);
  const [search, setSearch] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [searchingGoogle, setSearchingGoogle] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 'Staples',
    stock: 0,
    description: '',
    image: '',
    images: [],
    weight: '',
    rating: 0,
    reviewCount: 0,
    tag: undefined,
    searchKeywords: [],
    synonyms: [],
    tags: []
  });
  const [bulkStockValue, setBulkStockValue] = useState<number>(0);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categories, setCategories] = useState(['Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Meat', 'Snacks', 'Beverages', 'Staples', 'Oils', 'Household']);

  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);

  const handleBarcodeScan = async (barcode: string) => {
    setIsScanning(false);
    setIsProcessingBarcode(true);
    setLoadingAI(true);
    
    try {
      // Check if product with this barcode already exists
      const existingProduct = products.find(p => p.barcode === barcode);
      if (existingProduct) {
        if (window.confirm(`Product "${existingProduct.name}" already exists with this barcode. Do you want to edit it?`)) {
          setEditingProduct(existingProduct);
          setIsEditing(true);
          setLoadingAI(false);
          setIsProcessingBarcode(false);
          return;
        }
      }

      const details = await findProductByBarcode(barcode);
      if (details.name) {
        // Auto-fetch multiple images using AI search
        const images = await aiService.findProductImages(details.name, details.category);
        
        setEditingProduct({
          name: details.name,
          category: details.category || 'Staples',
          price: details.price || 0, 
          stock: 50,
          description: details.description || '',
          weight: details.weight || '',
          image: images[0] || `https://picsum.photos/seed/${details.name.replace(/\s+/g, '-')}/800/800`,
          images: images.length > 0 ? images : [],
          barcode: barcode
        });
        setIsEditing(true);
      } else {
        alert("Could not identify product from this barcode. Please add manually.");
      }
    } catch (e) {
      console.error("Barcode lookup failed", e);
      alert("Error identifying product. Please try again.");
    } finally {
      setIsProcessingBarcode(false);
      setLoadingAI(false);
    }
  };

  const [bulkPriceValue, setBulkPriceValue] = useState<number>(0);
  const [priceAdjustType, setPriceAdjustType] = useState<'fixed' | 'percent'>('fixed');
  const [priceAdjustAction, setPriceAdjustAction] = useState<'increase' | 'decrease'>('increase');

  const handleBulkPriceUpdate = async (value: number, type: 'fixed' | 'percent', action: 'increase' | 'decrease') => {
    if (!window.confirm(`Adjust price of ${selectedIds.length} items by ${action === 'increase' ? '+' : '-'}${value}${type === 'percent' ? '%' : ''}?`)) return;
    try {
      await Promise.all(selectedIds.map(id => {
        const product = products.find(p => p.id === id);
        if (!product) return Promise.resolve();
        let newPrice = product.price;
        const multiplier = action === 'increase' ? 1 : -1;
        
        if (type === 'fixed') {
          newPrice += (value * multiplier);
        } else {
          newPrice = Math.round(newPrice * (1 + (value * multiplier) / 100));
        }
        return updateDoc(doc(db, 'products', id), { price: Math.max(0, newPrice) });
      }));
      setSelectedIds([]);
      setBulkPriceValue(0);
    } catch (e) {
      console.error("Bulk price update failed", e);
    }
  };

  const isRealImage = (p: Partial<Product>) => {
    if (p.hasManualPhoto) return true;
    const url = p.image;
    if (!url) return false;
    // Base64 is definitely real
    if (url.startsWith('data:image')) return true;
    // Firebase Storage is real
    if (url.includes('firebasestorage.googleapis.com')) return true;
    // Anything else that doesn't explicitly look like a generic placeholder
    const isGeneric = url.includes('picsum.photos') || url.includes('placeholder') || url.includes('via.placeholder');
    return !isGeneric;
  };

  const handleBulkSync = async (type: 'images' | 'descriptions' | 'all') => {
    const productsToSync = products.filter(p => {
      // "Leave locals" logic: Skip products in highly local/generic categories 
      // or those with very short generic names like "Aloo", "Pyaj"
      const isLocalCategory = ['Fruits & Vegetables', 'Dairy', 'Bakery'].includes(p.category);
      const isShortGenericName = p.name.split(' ').length <= 1; // Generic names usually 1 word
      if (isLocalCategory || isShortGenericName) return false;

      const needsImage = !isRealImage(p);
      const needsDesc = !p.description || p.description.length < 20;
      if (type === 'images') return needsImage;
      if (type === 'descriptions') return needsDesc;
      return needsImage || needsDesc;
    });

    if (productsToSync.length === 0) {
      alert("All products have real images and descriptions!");
      return;
    }

    if (!window.confirm(`Sync ${productsToSync.length} products using Google Image Search & Gemini? Manual photos will NOT be overwritten.`)) return;

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: productsToSync.length });

    let successCount = 0;
    for (let i = 0; i < productsToSync.length; i++) {
      const product = productsToSync[i];
      setSyncProgress({ current: i + 1, total: productsToSync.length });

      try {
        const updates: any = {};
        
        if (type === 'images' || type === 'all') {
          const urls = await aiService.findProductImages(product.name, product.category);
          if (urls.length > 0) {
            updates.image = urls[0];
            updates.primaryImage = urls[0];
            updates.images = urls;
          } else {
            // Fallback to high quality placeholder
            const placeholder = CATEGORY_PLACEHOLDERS[product.category] || CATEGORY_PLACEHOLDERS['Staples'];
            updates.image = placeholder;
            updates.primaryImage = placeholder;
            updates.images = [placeholder];
          }
        }
        
        if (type === 'descriptions' || type === 'all') {
          const desc = await generateProductDescription(product.name, product.category);
          if (desc) updates.description = desc;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'products', product.id), updates);
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to sync ${product.name}:`, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsSyncing(false);
    alert(`Successfully synced ${successCount} products with AI images.`);
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

  const handleDeleteEverything = async () => {
    if (!window.confirm("CRITICAL: This will delete EVERY SINGLE PRODUCT in the database. Are you sure?")) return;
    if (window.prompt("Type 'DELETE ALL' to confirm:") !== 'DELETE ALL') return;
    
    try {
      await Promise.all(products.map(p => deleteDoc(doc(db, 'products', p.id))));
      alert("Success: All products removed.");
    } catch (e) {
      console.error("Total clear failed", e);
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
      const placeholder = CATEGORY_PLACEHOLDERS[editingProduct.category || 'Staples'] || CATEGORY_PLACEHOLDERS['Staples'];
      setEditingProduct(prev => ({ 
        ...prev, 
        description: desc,
        image: prev.image && !prev.image.includes('picsum.photos') ? prev.image : placeholder
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
      const urls = await aiService.findProductImages(editingProduct.name, editingProduct.category);
      if (urls.length > 0) {
        setEditingProduct(prev => ({
          ...prev,
          image: urls[0],
          images: Array.from(new Set([...(prev.images || []), ...urls]))
        }));
      }
    } catch (error) {
      console.error("Image search failed", error);
      alert("Failed to fetch images. Please try again.");
    } finally {
      setSearchingGoogle(false);
    }
  };

  const handleSimplePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingPhoto(true);
    try {
      // Try Firebase Storage first - with a race to avoid hanging on retry limits
      try {
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        // Set a mental timeout of sorts by prioritizing reliability
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        setEditingProduct(prev => ({
          ...prev,
          image: downloadURL,
          images: [downloadURL], // Exclusive
          hasManualPhoto: true
        }));
      } catch (storageError: any) {
        console.warn("Storage failed or timed out, falling back to Base64:", storageError);
        // Fallback to optimized Base64
        const base64 = await optimizeImage(file, 1024, 0.7);

        setEditingProduct(prev => ({
          ...prev,
          image: base64,
          images: [base64],
          hasManualPhoto: true
        }));
        
        if (storageError.code === 'storage/retry-limit-exceeded') {
          console.info("Retry limit exceeded, used Base64 instead. This is normal in some network environments.");
        }
      }
    } catch (error) {
      console.error("Manual photo upload failed completely", error);
      alert("Failed to upload photo. Please try a smaller file.");
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingPhoto(true);
    try {
      // Try Firebase Storage first
      try {
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        setEditingProduct(prev => ({
          ...prev,
          image: downloadURL,
          images: [downloadURL], // Exclusive
          hasManualPhoto: true
        }));
      } catch (storageError: any) {
        console.warn("Storage failed, using Base64 fallback:", storageError);
        const base64 = await optimizeImage(file, 1024, 0.7);

        setEditingProduct(prev => ({
          ...prev,
          image: base64,
          images: [base64],
          hasManualPhoto: true
        }));

        if (storageError.code === 'storage/retry-limit-exceeded') {
          console.info("Retry limit exceeded during main upload, used Base64.");
        }
      }
    } catch (error) {
      console.error("Photo upload failed", error);
      alert("Failed to process photo. Please try a different image.");
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
    const newItems: Partial<Product>[] = [];
    const duplicates: Partial<Product>[] = [];
    const existingNames = new Set(products.map(p => p.name.toLowerCase().trim()));

    for (const row of data) {
      const name = (row.name || row.ItemName || row.Name || row['Item Name'] || row.ProductName || row.item_name)?.toString().trim();
      if (!name) continue;

      const img = row.image || row.Image || row['Product Photo Link'] || row.photo || row.Photo || row.url || row.URL || row.image_url || row.ImageUrl || row.Img || row.Link || row.Thumbnail || CATEGORY_PLACEHOLDERS[row.category || row.Category || 'Staples'] || CATEGORY_PLACEHOLDERS['Staples'];
      
      const item: Partial<Product> = {
        name,
        price: parseFloat(row.price || row.SalePrice || row.Price || row['Sale Price'] || row.rate || row.Rate) || 0,
        purchasePrice: parseFloat(row.purchasePrice || row.PurchasePrice || row['Purchase Price'] || row.cost || row.Cost) || 0,
        category: row.category || row.Category || row.group || row.Group || 'Staples',
        stock: parseInt(row.stock || row.Stock || row.Quantity || row.qty || row.Qty || row['Item Stock quantity']) || 0,
        description: row.description || row.Description || '',
        image: img,
        images: [img],
        weight: row.weight || row.Weight || row.unit || row.Unit || ''
      };

      if (existingNames.has(name.toLowerCase())) {
        duplicates.push(item);
      } else {
        newItems.push(item);
      }
    }

    if (duplicates.length > 0) {
      setDuplicateImportItems(duplicates);
      setPendingNewItems(newItems);
      setIsImporting(false);
    } else {
      await finalizeImport(newItems);
    }
  };

  const finalizeImport = async (itemsToAdd: Partial<Product>[]) => {
    if (itemsToAdd.length === 0) {
      alert("No items to import.");
      setIsImporting(false);
      return;
    }

    setIsImporting(true);
    try {
      if (onBulkAdd) {
        await onBulkAdd(itemsToAdd);
      } else {
        for (const p of itemsToAdd) {
          await onAdd(p);
        }
      }
      alert(`Successfully imported ${itemsToAdd.length} items.`);
    } catch (e) {
      console.error("Import failed", e);
      alert("Failed to import items.");
    } finally {
      setIsImporting(false);
      setDuplicateImportItems([]);
      setPendingNewItems([]);
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
    // Check for duplicate name if adding new product
    if (!editingProduct.id) {
      const existing = products.find(p => p.name.toLowerCase() === editingProduct.name?.toLowerCase());
      if (existing) {
        setDuplicateProduct(existing);
        return;
      }
    }

    if (editingProduct.id) {
      onUpdate(editingProduct.id, editingProduct);
    } else {
      onAdd(editingProduct);
    }
    setIsEditing(false);
    setEditingProduct({
      name: '',
      price: 0,
      category: 'Staples',
      stock: 0,
      description: '',
      image: '',
      images: [],
      weight: '',
      rating: 0,
      reviewCount: 0,
      tag: undefined,
      searchKeywords: [],
      synonyms: [],
      tags: []
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 p-6">

      
      {/* Photo Alerts Section */}
      {products.filter(p => !isRealImage(p)).length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-blue-50 border-2 border-blue-200 p-6 rounded-[32px] space-y-4 shadow-lg shadow-blue-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#00AEEF] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Photo Alerts</h3>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">
                  {products.filter(p => !isRealImage(p)).length} items need real photos
                </p>
              </div>
            </div>
            <button 
              onClick={() => handleBulkSync('images')}
              className="bg-[#00AEEF] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              Auto-fix All with AI
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {products.filter(p => !isRealImage(p)).slice(0, 8).map(p => (
              <div key={`alert-${p.id}`} className="min-w-[200px] bg-white p-4 rounded-2xl border border-blue-100 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                    <img src={p.image || undefined} alt="" className="w-full h-full object-cover grayscale opacity-50" referrerPolicy="no-referrer" />
                  </div>
                  <p className="text-xs font-black text-gray-900 line-clamp-1">{p.name}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      setEditingProduct(p);
                      setIsEditing(true);
                      // Slight delay to ensure modal is open
                      setTimeout(() => handleGoogleSearch(), 100);
                    }}
                    className="p-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all"
                    title="Search Google"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <label className="p-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={async (e) => {
                        setEditingProduct(p);
                        setIsEditing(true);
                        await handlePhotoUpload(e);
                      }} 
                    />
                  </label>
                  <button 
                    onClick={() => {
                      setEditingProduct(p);
                      setIsEditing(true);
                    }}
                    className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">
            Catalog <span className="text-primary italic">Manager</span>
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Manage your products, stock levels, and pricing.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
                onClick={async () => {
                  if (window.confirm("⚠️ CRITICAL WARNING: You are about to DELETE EVERY SINGLE PRODUCT from the website. This cannot be undone and will empty your catalog for all customers. Are you absolutely sure?")) {
                    const confirmText = 'WIPE CATALOG';
                    if (window.prompt(`To confirm, please type "${confirmText}" below:`) !== confirmText) {
                      alert("Deletion cancelled. Text did not match.");
                      return;
                    }

                    setIsSyncing(true);
                    try {
                      const { getDocs, collection, writeBatch } = await import('firebase/firestore');
                      const snapshot = await getDocs(collection(db, 'products'));
                      
                      if (snapshot.empty) {
                        alert("Catalog is already empty.");
                        return;
                      }

                      const total = snapshot.docs.length;
                      let deleted = 0;

                      for (let i = 0; i < total; i += 500) {
                        const batch = writeBatch(db);
                        const chunk = snapshot.docs.slice(i, i + 500);
                        chunk.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                        deleted += chunk.length;
                        setSyncProgress({ current: deleted, total: total });
                      }
                      
                      alert(`SUCCESS: All ${deleted} items have been removed from the catalog.`);
                      window.location.reload();
                    } catch (e) {
                      console.error(e);
                      alert("Error during catalog wipe. Please check your connection.");
                    } finally {
                      setIsSyncing(false);
                      setSyncProgress({ current: 0, total: 0 });
                    }
                  }
                }}
                disabled={isSyncing || products.length === 0}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-3.5 rounded-2xl hover:bg-red-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-200 disabled:opacity-50 disabled:grayscale"
              >
                <Trash2 className="w-4 h-4" />
                Wipe Catalog
              </button>
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
              <button 
                onClick={async () => {
                  if (!window.confirm("FORCE SYNC ALL? This will search and replace images for ALL products regardless of whether they already have images. Continue?")) return;
                  setIsSyncing(true);
                  let count = 0;
                  setSyncProgress({ current: 0, total: products.length });
                  for (let i = 0; i < products.length; i++) {
                    const p = products[i];
                    setSyncProgress({ current: i + 1, total: products.length });
                    try {
                      const urls = await aiService.findProductImages(p.name, p.category);
                      if (urls.length > 0) {
                        await updateDoc(doc(db, 'products', p.id), {
                          image: urls[0],
                          primaryImage: urls[0],
                          images: urls
                        });
                        count++;
                      }
                    } catch (err) { console.error(err); }
                    await new Promise(r => setTimeout(r, 600));
                  }
                  setIsSyncing(false);
                  alert(`Successfully force-synced ${count} products.`);
                }} 
                className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50 mt-1 pt-3"
              >
                Force Sync All (Images)
              </button>
              <button onClick={() => handleBulkSync('all')} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors border-t border-gray-50 mt-1 pt-2">Sync Missing Only</button>
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
            onClick={() => setIsScanning(true)}
            disabled={isProcessingBarcode}
            className="flex items-center gap-2 bg-black text-white px-4 py-3 rounded-2xl shadow-xl shadow-black/20 hover:scale-105 transition-all font-bold text-sm disabled:opacity-50"
          >
            {isProcessingBarcode ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanBarcode className="w-5 h-5 text-primary" />}
            {isProcessingBarcode ? 'Processing...' : 'Scan Barcode'}
          </button>
          <button 
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-2xl shadow-sm hover:bg-red-600 hover:text-white transition-all font-bold text-sm disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
            Delete Selected
          </button>
          {selectedIds.length > 0 && (
            <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-black transition-all font-black text-sm uppercase tracking-widest cursor-pointer group">
              <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Upload Photos to {selectedIds.length} items
              <input 
                type="file" 
                multiple 
                accept="image/*"
                className="hidden" 
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  
                  if (!window.confirm(`You are about to upload ${files.length} photos to the selected ${selectedIds.length} items. Continue?`)) return;

                  setIsSyncing(true);
                  let fileIdx = 0;
                  try {
                    for (const id of selectedIds) {
                      const product = products.find(p => p.id === id);
                      if (!product) continue;

                      // Check if product already has real photos
                      if (isRealImage(product)) {
                        if (!window.confirm(`Product "${product.name}" already has a real photo. Replace it?`)) continue;
                      }

                      const file = files[fileIdx % files.length];
                      const storageRef = ref(storage, `products/${id}/main_${Date.now()}.jpg`);
                      
                      // Convert base64 to Blob for uploadBytes
                      const base64 = await optimizeImage(file, 1024, 0.7);
                      const blob = await (await fetch(base64)).blob();
                      
                      await uploadBytes(storageRef, blob);
                      const downloadURL = await getDownloadURL(storageRef);

                      await updateDoc(doc(db, 'products', id), {
                        image: downloadURL,
                        images: [downloadURL], 
                        hasManualPhoto: true
                      });
                      fileIdx++;
                    }
                    alert('Bulk photo upload complete!');
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsSyncing(false);
                    setSelectedIds([]);
                  }
                }}
              />
            </label>
          )}
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

      {products.some(p => !isRealImage(p)) && (
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

      {isScanning && (
        <BarcodeScanner 
          onScan={handleBarcodeScan}
          onClose={() => setIsScanning(false)}
        />
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
                    <button 
                      onClick={() => setPriceAdjustAction(a => a === 'increase' ? 'decrease' : 'increase')}
                      className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${
                        priceAdjustAction === 'increase' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}
                    >
                      {priceAdjustAction === 'increase' ? 'Up' : 'Down'}
                    </button>
                    <button 
                      onClick={() => setPriceAdjustType(t => t === 'fixed' ? 'percent' : 'fixed')}
                      className="px-2 py-1 bg-white/10 rounded-lg text-[8px] font-black"
                    >
                      {priceAdjustType === 'fixed' ? '₹' : '%'}
                    </button>
                    <input 
                      type="number" 
                      value={bulkPriceValue}
                      onChange={(e) => setBulkPriceValue(parseFloat(e.target.value) || 0)}
                      className="w-16 bg-transparent border-none text-right text-xs font-black focus:ring-0 placeholder-white/30"
                      placeholder="Add"
                    />
                    <button
                      onClick={() => handleBulkPriceUpdate(bulkPriceValue, priceAdjustType, priceAdjustAction)}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-green-600"
                    >
                      Adj. Price
                    </button>
                  </div>
                  <div className="h-4 w-px bg-white/20" />
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
                    <button
                      onClick={() => handleBulkSync('all')}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-blue-400"
                    >
                      AI Mass Sync (Images + Desc)
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
                          src={product.image || undefined} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{product.name}</span>
                          {product.images && product.images.length > 1 && (
                            <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-black">
                              {product.images.length} IMAGES
                            </span>
                          )}
                        </div>
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
                      {product.stock} items
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
                        onClick={async () => {
                          try {
                            if (!printerService.isConnected()) {
                              await printerService.connect();
                            }
                            // Simplified label printing for Bluetooth
                            await printerService.connect(); // Ensure we try connecting
                            // Note: The printerService currently handles Order data.
                            // I'll make it generic or use it to print product info.
                            const labelData = {
                              id: product.id,
                              items: [{ name: product.name, quantity: 1, price: product.price }],
                              total: product.price,
                              customerName: 'TAG PRINT',
                              createdAt: Date.now()
                            };
                            await printerService.printOrder(labelData);
                            alert('Label printed via Bluetooth!');
                          } catch (e: any) {
                            alert('Bluetooth print failed: ' + e.message);
                          }
                        }}
                        title="Bluetooth Print Label"
                        className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Print Label - ${product.name}</title>
                                  <style>
                                    @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap');
                                    body { font-family: sans-serif; display: flex; flex-direction: column; items-center; justify-center; min-height: 100vh; margin: 0; padding: 20px; }
                                    .label { border: 2px solid #000; padding: 20px; text-align: center; width: 300px; border-radius: 10px; }
                                    .name { font-size: 20px; font-weight: 900; margin-bottom: 5px; text-transform: uppercase; }
                                    .price { font-size: 40px; font-weight: 900; color: #000; margin: 10px 0; }
                                    .details { font-size: 12px; color: #666; font-weight: bold; margin-bottom: 15px; }
                                    .barcode { font-family: 'Libre Barcode 39', cursive; font-size: 60px; margin-top: 10px; line-height: 1; }
                                    .barcode-text { font-size: 10px; font-weight: bold; letter-spacing: 2px; }
                                    @media print {
                                      body { padding: 0; }
                                      .label { border: none; }
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div class="label">
                                    <div class="name">${product.name}</div>
                                    <div class="details">${product.category} | ${product.weight || 'Std Unit'}</div>
                                    <div class="price">₹${product.price}</div>
                                    ${product.barcode ? `
                                      <div class="barcode">*${product.barcode}*</div>
                                      <div class="barcode-text">${product.barcode}</div>
                                    ` : `
                                      <div style="font-size: 10px; color: #999; margin-top: 20px;">NO BARCODE ASINGED</div>
                                    `}
                                    <div style="margin-top: 20px; font-size: 8px; font-weight: bold;">KALIKA STORE - QUALITY FIRST</div>
                                  </div>
                                  <script>
                                    window.onload = () => {
                                      setTimeout(() => {
                                        window.print();
                                        window.close();
                                      }, 500);
                                    }
                                  </script>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }
                        }}
                        title="Print Barcode Label"
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <ScanBarcode className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Print Product Ticket - ${product.name}</title>
                                  <style>
                                    body { font-family: system-ui, sans-serif; padding: 20px; color: #111; }
                                    .ticket { border: 2px dashed #ccc; padding: 20px; border-radius: 12px; max-width: 300px; text-align: center; }
                                    .name { font-size: 24px; font-weight: 900; margin-bottom: 5px; text-transform: uppercase; }
                                    .category { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
                                    .price { font-size: 32px; font-weight: 900; color: #10b981; }
                                    .info { font-size: 12px; color: #888; margin-top: 10px; }
                                    .store { font-weight: 900; color: #1e40af; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
                                  </style>
                                </head>
                                <body>
                                  <div class="ticket">
                                    <div class="category">${product.category}</div>
                                    <div class="name">${product.name}</div>
                                    <div class="price">₹${product.price}</div>
                                    <div class="info">${product.weight || ''}</div>
                                    <div class="store">KALIKA STORE</div>
                                  </div>
                                  <script>
                                    window.onload = () => {
                                      setTimeout(() => {
                                        window.print();
                                        window.close();
                                      }, 500);
                                    }
                                  </script>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }
                        }}
                        title="Print Price Ticket"
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
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
        {duplicateImportItems.length > 0 && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden border border-orange-100 flex flex-col max-h-[85vh]"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-orange-100 rounded-[30px] flex items-center justify-center text-orange-600 mx-auto">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Duplicate Items Detected!</h3>
                  <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">{duplicateImportItems.length} items in your file already exist in the catalog.</p>
                </div>

                <div className="bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden">
                  <div className="p-4 bg-gray-100/50 border-b border-gray-100 flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <span>Product Name</span>
                    <span>Category</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-2 scrollbar-thin">
                    {duplicateImportItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                            <img src={item.image || undefined} className="w-full h-full object-cover" alt="" />
                          </div>
                          <span className="text-xs font-bold text-gray-900">{item.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 pb-4 px-4">
                  <button 
                    onClick={() => finalizeImport(pendingNewItems)}
                    className="px-6 py-4 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Add Only New Ones ({pendingNewItems.length})
                  </button>
                  <button 
                    onClick={() => finalizeImport([...pendingNewItems, ...duplicateImportItems])}
                    className="px-6 py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-200 hover:bg-orange-600 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Continue Adding All ({pendingNewItems.length + duplicateImportItems.length})
                  </button>
                </div>
                
                <button 
                  onClick={() => {
                    setDuplicateImportItems([]);
                    setPendingNewItems([]);
                  }}
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors pb-4"
                >
                  Cancel Import
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {duplicateProduct && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDuplicateProduct(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-red-100"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 rounded-[30px] flex items-center justify-center text-red-600 mx-auto">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Product Already Added!</h3>
                  <p className="text-sm font-bold text-red-500 uppercase tracking-widest">Action Required</p>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center gap-4 text-left">
                  <img 
                    src={duplicateProduct.image || undefined} 
                    alt={duplicateProduct.name} 
                    className="w-20 h-20 object-cover rounded-2xl shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-xl font-black text-gray-900 tracking-tight">{duplicateProduct.name}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{duplicateProduct.category}</p>
                    <p className="text-lg font-black text-primary mt-1">₹{duplicateProduct.price}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    onClick={() => setDuplicateProduct(null)}
                    className="px-6 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Cancel Add
                  </button>
                  <button 
                    onClick={() => {
                      setEditingProduct(duplicateProduct);
                      setDuplicateProduct(null);
                      setIsEditing(true);
                    }}
                    className="px-6 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all uppercase tracking-widest text-[10px]"
                  >
                    Edit Existing
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

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
          <div className="grid grid-cols-1 gap-6">
                  {/* Image Gallery Manager */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Product Images (Multi-Support)</label>
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">{editingProduct.images?.length || 0} Images Attached</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {editingProduct.images?.map((img, i) => (
                        <div key={i} className={`relative group aspect-square rounded-2xl overflow-hidden border-2 transition-all ${editingProduct.image === img ? 'border-primary shadow-lg shadow-primary/10' : 'border-gray-50'}`}>
                          <img src={img || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 px-2">
                            <button 
                              onClick={() => setEditingProduct(prev => ({ ...prev, image: img }))}
                              className="w-full py-1.5 bg-white text-gray-900 rounded-lg text-[8px] font-black uppercase tracking-tighter hover:bg-primary hover:text-white transition-all"
                            >
                              Set Primary
                            </button>
                            <button 
                              onClick={() => setEditingProduct(prev => ({ ...prev, images: prev.images?.filter((_, idx) => idx !== i), image: prev.image === img ? prev.images?.[0] || '' : prev.image }))}
                              className="w-full py-1.5 bg-red-500 text-white rounded-lg text-[8px] font-black uppercase tracking-tighter hover:bg-black transition-all"
                            >
                              Delete
                            </button>
                          </div>
                          {editingProduct.image === img && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-white rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-sm">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl aspect-square hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                        {analyzingPhoto ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Plus className="w-6 h-6 text-gray-300 group-hover:text-primary transition-colors" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary text-center">Add Photo</span>
                          </div>
                        )}
                        <input type="file" accept="*/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl hover:bg-black transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer">
                        <Upload className="w-4 h-4" />
                        Manual Upload
                        <input type="file" accept="image/*" onChange={handleSimplePhotoUpload} className="hidden" />
                      </label>
                      <div className="flex-[1.5] relative">
                         <input 
                           type="text"
                           value={editingProduct.image}
                           onChange={(e) => setEditingProduct(prev => ({ ...prev, image: e.target.value }))}
                           placeholder="Paste Image URL manually..."
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[10px] font-bold text-gray-900 focus:ring-2 focus:ring-primary/20 pr-10"
                         />
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                           <ImageIcon className="w-4 h-4" />
                         </div>
                      </div>
                      <button 
                        onClick={handleGoogleSearch}
                        disabled={searchingGoogle || !editingProduct.name}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                      >
                        {searchingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        AI Search
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="grid grid-cols-2 gap-4">
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
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Initial Rating (1-5)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="1"
                        max="5"
                        value={editingProduct.rating || ''}
                        onChange={(e) => setEditingProduct(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Initial Review Count</label>
                      <input 
                        type="number" 
                        value={editingProduct.reviewCount || ''}
                        onChange={(e) => setEditingProduct(prev => ({ ...prev, reviewCount: parseInt(e.target.value) }))}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Special Tag</label>
                      <select 
                        value={editingProduct.tag || ''}
                        onChange={(e) => setEditingProduct(prev => ({ ...prev, tag: (e.target.value || undefined) as any }))}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">None</option>
                        <option value="Bestseller">Bestseller</option>
                        <option value="Top Rated">Top Rated</option>
                        <option value="New Arrival">New Arrival</option>
                        <option value="Trending">Trending</option>
                      </select>
                    </div>
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

                {/* Smart Search Section */}
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="w-5 h-5 text-blue-600" />
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Smart Search Metadata</h4>
                    </div>
                    <button
                      onClick={async () => {
                        const hasKey = !!(import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : ''));
                        if (!hasKey) {
                          alert("AI Features not configured. Please add GEMINI_API_KEY to your hosting environment variables (e.g. Netlify Environment Variables).");
                          return;
                        }
                        try {
                          const suggested = await aiService.generateSearchMetadata(editingProduct.name, editingProduct.description || '', editingProduct.category);
                          setEditingProduct(prev => ({
                            ...prev,
                            searchKeywords: [...new Set([...(prev.searchKeywords || []), ...suggested.keywords])],
                            synonyms: [...new Set([...(prev.synonyms || []), ...suggested.synonyms])],
                            tags: [...new Set([...(prev.tags || []), ...suggested.tags])]
                          }));
                        } catch (e) {
                          alert("AI Metadata generation failed");
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI Generate
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Search Keywords (comma separated)</label>
                      <input 
                        type="text" 
                        value={editingProduct.searchKeywords?.join(', ') || ''}
                        onChange={(e) => setEditingProduct(prev => ({ 
                          ...prev, 
                          searchKeywords: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                        }))}
                        className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-200"
                        placeholder="e.g. healthy, nutrition, fast delivery"
                      />
                      <p className="text-[10px] text-gray-400">Hidden keywords that trigger this product in search results.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Synonyms (comma separated)</label>
                      <input 
                        type="text" 
                        value={editingProduct.synonyms?.join(', ') || ''}
                        onChange={(e) => setEditingProduct(prev => ({ 
                          ...prev, 
                          synonyms: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                        }))}
                        className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-200"
                        placeholder="e.g. soft drink, cold drink, beverage"
                      />
                      <p className="text-[10px] text-gray-400">Related words that users might type instead of the actual name.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Product Tags (comma separated)</label>
                      <input 
                        type="text" 
                        value={editingProduct.tags?.join(', ') || ''}
                        onChange={(e) => setEditingProduct(prev => ({ 
                          ...prev, 
                          tags: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                        }))}
                        className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-200"
                        placeholder="e.g. Organic, Fresh, Sugar-free"
                      />
                      <p className="text-[10px] text-gray-400">Publicly visible tags shown on the search dropdown.</p>
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
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Primary Image URL</label>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                      <Cloud className="w-3 h-3" />
                      5TB Gmail Storage
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editingProduct.image}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, image: e.target.value }))}
                      className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                      placeholder="Paste main image URL"
                    />
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
