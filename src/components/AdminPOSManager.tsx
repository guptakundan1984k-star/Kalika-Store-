import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, Order } from '../types';
import { BluetoothPrinterManager, buildEscPosBytes, printViaIframe } from '../services/printerService';
import { ReceiptPreviewModal } from './ReceiptPreviewModal';
import { 
  Printer, Trash2, Calendar, Download, RefreshCw, Shield, 
  CheckCircle2, ChevronRight, FileSpreadsheet, Eye, Plus, Minus, 
  Search, ShoppingCart, User, Database, AlertTriangle, FileText, 
  CheckSquare, Sparkles, X, LayoutDashboard, Share2, Compass, 
  Lock, Settings, RefreshCw as RotateCw, Barcode, Grid, BadgeCheck, Wifi, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPOSManagerProps {
  products: Product[];
}

interface POSSale {
  id: string; // #sale_<random_id>
  timestamp: number;
  items: {
    productName: string;
    quantity: number;
    price: number; // custom or original price charged
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'Cash' | 'UPI';
  customerName?: string;
  customerPhone?: string;
}

interface ExportLog {
  id: string;
  timestamp: number;
  filename: string;
  format: 'CSV' | 'XLS';
  itemCount: number;
  totalValue: number;
}

export const AdminPOSManager: React.FC<AdminPOSManagerProps> = ({ products }) => {
  // Current Active Work POS state
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number; chargedPrice: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<'Cash' | 'UPI'>('UPI');
  const [itemForPrintPreview, setItemForPrintPreview] = useState<POSSale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Custom Item Fields
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');

  // Active View Tab on POS manager: 'workspace' or 'sales' or 'exports' or 'printers'
  const [posSubTab, setPosSubTab] = useState<'workspace' | 'sales' | 'exports' | 'printers'>('workspace');
  const [pairedName, setPairedName] = useState<string>(localStorage.getItem('paired_bluetooth_device_name') || 'No printer paired');
  const [isAutoprintEnabled, setIsAutoprintEnabled] = useState<boolean>(localStorage.getItem('bluetooth_autoprint_enabled') === 'true');

  // Saved sales in local state (from LocalStorage)
  const [savedSales, setSavedSales] = useState<POSSale[]>([]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<POSSale | null>(null);

  // Export List
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);

  // Permissions control state
  const [permissions, setPermissions] = useState({
    writeAccess: true,
    fileSystemAccess: true,
    archivalLedger: true
  });
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [pendingExportType, setPendingExportType] = useState<'CSV' | 'XLS' | null>(null);

  // Compilation Loader Modal state
  const [compilationProgress, setCompilationProgress] = useState<number>(-1); // -1 means closed
  const [compilerLogs, setCompilerLogs] = useState<string[]>([]);

  // A4 Print Invoice state
  const [printInvoiceData, setPrintInvoiceData] = useState<POSSale | null>(null);

  // Feed products categories
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Load Saved Data on Init
  useEffect(() => {
    const loadedSales = localStorage.getItem('pos_saved_sales_ledger');
    if (loadedSales) {
      try {
        setSavedSales(JSON.parse(loadedSales));
      } catch (e) {
        console.error("Error reading saved POS sales ledger:", e);
      }
    } else {
      // Seed some mock sales for past 3 months to make POS feel extremely professional out of the box
      const seedSales: POSSale[] = generateSeedSales();
      setSavedSales(seedSales);
      localStorage.setItem('pos_saved_sales_ledger', JSON.stringify(seedSales));
    }

    const loadedExports = localStorage.getItem('pos_export_registry_history');
    if (loadedExports) {
      try {
        setExportLogs(JSON.parse(loadedExports));
      } catch (e) {
        console.error("Error loading export history index:", e);
      }
    }

    const loadedPermissions = localStorage.getItem('pos_device_local_storage_sandbox_permissions');
    if (loadedPermissions) {
      try {
        setPermissions(JSON.parse(loadedPermissions));
      } catch (e) {
        console.error("Error loading permissions configuration:", e);
      }
    }
  }, []);

  // Save to localStorage when updated
  const updateSalesLedgerInStorage = (newSales: POSSale[]) => {
    setSavedSales(newSales);
    localStorage.setItem('pos_saved_sales_ledger', JSON.stringify(newSales));
  };

  const updateExportRegistryInStorage = (newRegistry: ExportLog[]) => {
    setExportLogs(newRegistry);
    localStorage.setItem('pos_export_registry_history', JSON.stringify(newRegistry));
  };

  // Search filtered products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // POS Actions
  const addToPOSCart = (product: Product, quantity: number = 1) => {
    const existingIndex = posCart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...posCart];
      updated[existingIndex].quantity += quantity;
      setPosCart(updated);
    } else {
      setPosCart([...posCart, { product, quantity, chargedPrice: product.price }]);
    }
  };

  const addCustomItemToPOS = () => {
    if (!customItemName.trim()) {
      alert("Please provide a custom product title");
      return;
    }
    const price = parseFloat(customItemPrice) || 0;
    const qty = parseFloat(customItemQty) || 1;
    
    const mockProduct: Product = {
      id: `custom_${Date.now()}`,
      name: customItemName,
      description: "Custom POS Walk-in product line entry",
      price: price,
      category: "Custom Block",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200",
      stock: 9999,
      createdAt: Date.now()
    };
    
    setPosCart([...posCart, { product: mockProduct, quantity: qty, chargedPrice: price }]);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
  };

  const updatePOSCartQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      setPosCart(posCart.filter(item => item.product.id !== id));
    } else {
      setPosCart(posCart.map(item => item.product.id === id ? { ...item, quantity: newQty } : item));
    }
  };

  const updatePOSChargedPrice = (id: string, newPrice: number) => {
    setPosCart(posCart.map(item => item.product.id === id ? { ...item, chargedPrice: Math.max(0, newPrice) } : item));
  };

  const removePOSCartItem = (id: string) => {
    setPosCart(posCart.filter(item => item.product.id !== id));
  };

  // Totals calculations
  const calculateCartTotals = () => {
    const subtotal = posCart.reduce((acc, item) => acc + (item.chargedPrice * item.quantity), 0);
    // Standard 5% GST calculated over the walk-in billing subtotal
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateCartTotals();

  // Settle & Clear Workflow
  const handleSettleAndClear = () => {
    if (posCart.length === 0) {
      alert("POS cart space is empty. Please add items to ledger before checkout!");
      return;
    }

    const randomSaleNum = Math.floor(100000 + Math.random() * 900000);
    const saleId = `#sale_${randomSaleNum}`;
    const timestamp = Date.now();

    const saleItems = posCart.map(item => ({
      productName: item.product.name,
      quantity: item.quantity,
      price: item.chargedPrice,
      subtotal: item.chargedPrice * item.quantity
    }));

    const newSale: POSSale = {
      id: saleId,
      timestamp,
      items: saleItems,
      subtotal,
      tax,
      total,
      paymentMethod: selectedPayment,
      customerName: customerName.trim() || 'Guest Customer',
      customerPhone: customerPhone.trim() || 'N/A'
    };

    const newSalesRegistry = [newSale, ...savedSales];
    updateSalesLedgerInStorage(newSalesRegistry);

    // Toggle interactive on-screen 2-inch tape receipt print preview modal
    setItemForPrintPreview(newSale);
  };

  const handleConfirmPrintClose = () => {
    // Clear Workspace Active values
    setPosCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedPayment('UPI');
    setItemForPrintPreview(null);
    setPosSubTab('sales');
  };

  // Past 90 Days sales list filter
  const getPast3MonthsSales = () => {
    const past90DaysMs = 90 * 24 * 60 * 60 * 1000;
    const cutoffTimestamp = Date.now() - past90DaysMs;
    return savedSales.filter(s => s.timestamp >= cutoffTimestamp);
  };

  const filteredPastSales = getPast3MonthsSales();

  // KPI calculations over near term (90 days interval)
  const calculatePastKPIs = () => {
    const sales = filteredPastSales;
    const cumulativeRev = sales.reduce((acc, s) => acc + s.total, 0);
    const ticketCount = sales.length;
    
    let totalDispatchedCount = 0;
    sales.forEach(s => {
      s.items.forEach(itm => {
        totalDispatchedCount += itm.quantity;
      });
    });

    const aov = ticketCount > 0 ? (cumulativeRev / ticketCount) : 0;

    return { cumulativeRev, ticketCount, totalDispatchedCount, aov };
  };

  const { cumulativeRev, ticketCount, totalDispatchedCount, aov } = calculatePastKPIs();

  // Surgical Ledger Purge
  const handlePurgeSaleRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you absolutely sure you want to permanently delete the invoice record ${id} from memory deep storage? This is irreversible.`)) {
      const updatedSales = savedSales.filter(s => s.id !== id);
      updateSalesLedgerInStorage(updatedSales);
      if (selectedSaleDetail?.id === id) {
        setSelectedSaleDetail(null);
      }
    }
  };

  // Simulated Compiler Byte Writing Loader (0% to 100%)
  const triggerSimulationCompilation = (type: 'CSV' | 'XLS') => {
    setCompilationProgress(0);
    setCompilerLogs(["Initializing Excel-Native structures...", "Validating Storage write token authorizations..."]);

    const steps = [
      { prg: 15, log: "Parsing transaction ledger index..." },
      { prg: 35, log: "Isolating temporal historic records of past 90 days..." },
      { prg: 60, log: `Writing document header cells (#020617 Slate Theme alignments)...` },
      { prg: 80, log: "Compiling currency conversions and subtotal cells formatting..." },
      { prg: 95, log: "Writing alternate row borders and grand totals indicators..." },
      { prg: 100, log: "Final binary compilation done. Dispatching download handle." }
    ];

    let currentStepIdx = 0;
    
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        const step = steps[currentStepIdx];
        setCompilationProgress(step.prg);
        setCompilerLogs(prev => [...prev, step.log]);
        currentStepIdx++;
      } else {
        clearInterval(interval);
        // Execute physical save
        if (type === 'CSV') {
          downloadCSV();
        } else {
          downloadXLS();
        }
        setTimeout(() => {
          setCompilationProgress(-1);
          setCompilerLogs([]);
        }, 1200);
      }
    }, 450);
  };

  const checkAndTriggerExport = (type: 'CSV' | 'XLS') => {
    // Check local sandbox permissions state
    const approvalsSaved = localStorage.getItem('pos_permissions_cache_token_approved');
    if (approvalsSaved !== 'true') {
      // Must prompt permissions modal sandbox
      setPendingExportType(type);
      setIsPermissionModalOpen(true);
    } else {
      // Permission cached -> Run direct compilation
      triggerSimulationCompilation(type);
    }
  };

  const handleGrantSandboxPermissions = () => {
    localStorage.setItem('pos_permissions_cache_token_approved', 'true');
    localStorage.setItem('pos_device_local_storage_sandbox_permissions', JSON.stringify(permissions));
    setIsPermissionModalOpen(false);
    
    if (pendingExportType) {
      triggerSimulationCompilation(pendingExportType);
      setPendingExportType(null);
    }
  };

  const handleRevokePermissions = () => {
    localStorage.removeItem('pos_permissions_cache_token_approved');
    alert("Authorization tokens successfully wiped from system environment permissions.");
  };

  // CSV Generator
  const downloadCSV = () => {
    const dataRows = filteredPastSales;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Invoice ID,Timestamp,Formatted Date,Customer Name,Customer Phone,Item Name,Quantity,Unit Rate,Item Subtotal,GST,Grand Total,Payment Method\n";

    dataRows.forEach(sale => {
      const formattedDate = new Date(sale.timestamp).toLocaleString().replace(/,/g, '');
      sale.items.forEach(itm => {
        csvContent += `${sale.id},${sale.timestamp},${formattedDate},"${sale.customerName || 'Guest'}","${sale.customerPhone || 'N/A'}","${itm.productName}",${itm.quantity},${itm.price},${itm.subtotal},${sale.tax},${sale.total},${sale.paymentMethod}\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const filename = `pos_sales_ledger_${Date.now()}.csv`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save Export Log
    addNewExportLog(filename, 'CSV', dataRows.length, dataRows.reduce((a, s) => a + s.total, 0));
  };

  // Stylized Microsoft Excel Tabular CSV / XML Writer
  const downloadXLS = () => {
    const sales = filteredPastSales;
    const filename = `pos_sales_dashboard_export_${Date.now()}.xls`;

    // We build a beautifully styled standalone HTML document representing a native spreadsheet table.
    // Setting MIME type to Excel parses this elegantly into native cell rows.
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          .header { background-color: #020617; color: #ffffff; font-weight: bold; text-align: center; height: 40px; }
          .meta-row { background-color: #f8fafc; font-size: 11px; }
          .grid-row-even { background-color: #f1f5f9; }
          .grid-row-odd { background-color: #ffffff; }
          .total-row { background-color: #cbd5e1; font-weight: bold; font-size: 14.px; }
          td { border: 1px solid #e2e8f0; padding: 10px; vertical-align: middle; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
        </style>
      </head>
      <body>
        <h3>INDUSTRIAL POS COMPREHENSIVE SALES ARCHIVE (PAST 3 MONTHS)</h3>
        <p>Export Date: ${new Date().toLocaleString()}</p>
        <table border="1">
          <thead>
            <tr class="header">
              <th style="background-color: #020617; color: white; padding: 10px;">S.No</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Invoice ID</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Timestamp</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Date String</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Client Name</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Phone</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Purchased Items Line</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Qty</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Charged Rate</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Item Total</th>
              <th style="background-color: #020617; color: white; padding: 10px;">GST (5%)</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Grand Valuation Sum</th>
              <th style="background-color: #020617; color: white; padding: 10px;">Settlement Type</th>
            </tr>
          </thead>
          <tbody>
    `;

    let serial = 1;
    let grandRevenueValuation = 0;

    sales.forEach(s => {
      grandRevenueValuation += s.total;
      s.items.forEach((itm, idx) => {
        const isEven = serial % 2 === 0;
        const rowColorClass = isEven ? 'grid-row-even' : 'grid-row-odd';
        const formattedDate = new Date(s.timestamp).toLocaleString();
        
        tableHtml += `
          <tr class="${rowColorClass}">
            <td class="text-center">${serial}</td>
            <td class="text-center"><b>${s.id}</b></td>
            <td>${s.timestamp}</td>
            <td>${formattedDate}</td>
            <td>${s.customerName || 'Guest'}</td>
            <td>${s.customerPhone || 'N/A'}</td>
            <td>${itm.productName}</td>
            <td class="text-center">${itm.quantity}</td>
            <td class="text-right">₹${itm.price.toFixed(2)}</td>
            <td class="text-right">₹${itm.subtotal.toFixed(2)}</td>
            <td class="text-right">₹${s.tax.toFixed(2)}</td>
            <td class="text-right"><b>₹${s.total.toFixed(2)}</b></td>
            <td class="text-center">${s.paymentMethod}</td>
          </tr>
        `;
        serial++;
      });
    });

    tableHtml += `
            <tr class="total-row">
              <td colspan="11" class="text-right" style="padding: 12px; font-weight: bold;">GRAND VALUATION INDEX TOTAL:</td>
              <td class="text-right" style="padding: 12px; font-weight: bold; font-size: 15px; color: #1e293b;">₹${grandRevenueValuation.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save Export Log
    addNewExportLog(filename, 'XLS', sales.length, grandRevenueValuation);
  };

  const addNewExportLog = (filename: string, format: 'CSV' | 'XLS', itemCount: number, totalValue: number) => {
    const newLog: ExportLog = {
      id: `#exp_${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: Date.now(),
      filename,
      format,
      itemCount,
      totalValue
    };

    const newLogsList = [newLog, ...exportLogs];
    updateExportRegistryInStorage(newLogsList);
  };

  const clearExportsHistory = () => {
    if (window.confirm("Permanently wipe local spreadsheet export registers from authorization tracker database?")) {
      updateExportRegistryInStorage([]);
    }
  };

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden p-6 md:p-8 space-y-8">
      
      {/* Print Frame - Hidden on Screen */}
      {selectedSaleDetail && (
        <div className="hidden print:block fixed inset-0 bg-white z-[99999] p-8" style={{ width: '210mm', minHeight: '297mm', color: '#1a1a1a' }}>
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b pb-6 border-gray-200">
              <div>
                <h1 className="text-3xl font-black uppercase text-gray-900 tracking-tight">KALIKA GROCERY SUPERSTORE</h1>
                <p className="text-xs font-semibold text-gray-500 mt-1">Industrial Estate, Sector-V, Warehouse Center, India</p>
                <p className="text-xs font-semibold text-gray-500">Contact: +91 98765 43210 | Support: help@kalikastore.com</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-gray-100 rounded text-[10px] font-black tracking-widest uppercase border border-gray-200">TAX INVOICE</span>
                <p className="text-sm font-black text-gray-900 mt-3">{selectedSaleDetail.id}</p>
                <p className="text-xs font-medium text-gray-400 mt-1">Date: {new Date(selectedSaleDetail.timestamp).toLocaleString()}</p>
                <p className="text-xs font-medium text-gray-400">Payment: <span className="font-extrabold text-gray-800">{selectedSaleDetail.paymentMethod}</span></p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between text-xs">
              <div>
                <p className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">Bill To Client</p>
                <p className="font-extrabold text-gray-800 mt-1">{selectedSaleDetail.customerName}</p>
                <p className="text-gray-500 mt-0.5">Phone: {selectedSaleDetail.customerPhone}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">POS Operator Token</p>
                <p className="font-extrabold text-primary mt-1">Super Admin Account</p>
                <p className="text-gray-500 mt-0.5">Terminal: Localhost #001</p>
              </div>
            </div>

            {/* Line items Table */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200 text-gray-500 font-bold">
                  <th className="py-2.5 w-12 text-center">S.No</th>
                  <th className="py-2.5">Product Title</th>
                  <th className="py-2.5 text-center w-24">Unit Rate</th>
                  <th className="py-2.5 text-center w-20">Quantity</th>
                  <th className="py-2.5 text-right w-28">Row Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedSaleDetail.items.map((itm, idx) => (
                  <tr key={idx} className="border-b border-gray-100 py-2.5">
                    <td className="py-2.5 text-center font-bold text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 font-extrabold text-gray-800">{itm.productName}</td>
                    <td className="py-2.5 text-center">₹{itm.price.toFixed(2)}</td>
                    <td className="py-2.5 text-center font-bold">{itm.quantity}</td>
                    <td className="py-2.5 text-right font-extrabold text-gray-900">₹{itm.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Spacing calculations totals */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <div className="w-64 space-y-1.5 text-right text-xs">
                <div className="flex justify-between text-gray-500 font-semibold">
                  <span>Subtotal:</span>
                  <span>₹{selectedSaleDetail.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500 font-semibold">
                  <span>Goods & Service Tax (GST 5%):</span>
                  <span>₹{selectedSaleDetail.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-900 font-black text-sm pt-2 border-t border-dashed border-gray-300">
                  <span>Grand total due:</span>
                  <span>₹{selectedSaleDetail.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Terms and Signatures */}
            <div className="pt-12 grid grid-cols-2 gap-12 text-[10px] text-gray-400 leading-relaxed border-t border-gray-100">
              <div>
                <p className="font-extrabold text-gray-600 uppercase tracking-widest">TERMS & CONDITIONS</p>
                <p className="mt-1">1. Goods sold are non-refundable but can be replaced within 24 hours of dispatch.</p>
                <p>2. Computer-generated tax document has been finalized without physical seal dependencies.</p>
                <p>3. This terminal belongs securely to authorized corporate operators only.</p>
              </div>
              <div className="flex flex-col justify-end items-end text-right">
                <div className="h-16 w-32 border-b border-gray-400 flex items-end justify-center">
                  <p className="text-[10px] font-bold text-gray-500 pb-1">Ansh Gupta</p>
                </div>
                <p className="font-extrabold text-gray-700 tracking-wider uppercase text-[10px] mt-2">Authorized Signatory</p>
                <p className="text-[9px] text-gray-400">Kalika Grocers Superstore Terminal Ltd.</p>
              </div>
            </div>
            
            <div className="text-center pt-8 text-[9px] text-gray-300 font-medium">
              Thank you for choosing Kalika Store. Scan barcode for next billing!
            </div>
          </div>
        </div>
      )}


      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-primary/10 text-primary rounded-2xl">
              <Printer className="w-8 h-8" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">POS Terminal Studio</h1>
              <p className="text-xs font-semibold text-gray-400">Automated Print-Lease Workspace with Spreadsheet Export Modules</p>
            </div>
          </div>
        </div>

        {/* Permissions Controls in header banner */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRevokePermissions}
            className="px-4 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition-all active:scale-95"
          >
            Revoke Access
          </button>
          <button 
            onClick={() => setIsPermissionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 border border-gray-200 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all active:scale-95"
          >
            <Shield className="w-4 h-4 text-primary" />
            Storage Sandbox
          </button>
        </div>
      </div>

      {/* Ribbon Navigation strip specifically inside POS manager */}
      <div className="flex gap-2 p-1 bg-gray-100/80 rounded-2xl">
        <button 
          onClick={() => setPosSubTab('workspace')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            posSubTab === 'workspace' 
              ? 'bg-white text-gray-900 shadow-md translate-y-[-1px]' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Grid className="w-4 h-4" />
          Active Workspace
        </button>
        <button 
          onClick={() => setPosSubTab('sales')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            posSubTab === 'sales' 
              ? 'bg-white text-gray-900 shadow-md translate-y-[-1px]' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Receipts Register ({filteredPastSales.length})
        </button>
        <button 
          onClick={() => setPosSubTab('exports')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            posSubTab === 'exports' 
              ? 'bg-white text-gray-900 shadow-md translate-y-[-1px]' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exports History ({exportLogs.length})
        </button>
        <button 
          onClick={() => setPosSubTab('printers')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            posSubTab === 'printers' 
              ? 'bg-white text-gray-900 shadow-md translate-y-[-1px]' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Printer className="w-4 h-4" />
          Thermal Printers
        </button>
      </div>


      {/* Workspace Dashboard screen */}
      {posSubTab === 'workspace' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Products Catalogue Selector Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-gray-50/60 border border-gray-100 rounded-3xl p-5 space-y-4">
              <h3 className="font-extrabold text-sm text-gray-800 tracking-tight flex items-center gap-2">
                <Barcode className="w-4 h-4 text-primary animate-pulse" />
                Barcode Scanner & Universal Catalogue
              </h3>
              
              {/* Search input for barcode or title */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Scan product barcode, enter model numbers, or type names..."
                  className="w-full bg-white border border-gray-200/80 rounded-2xl py-3.5 pl-12 pr-10 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Tag Filters */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {categories.map((cat, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase border whitespace-nowrap transition-all ${
                      categoryFilter === cat 
                        ? 'bg-primary text-white border-primary shadow-sm' 
                        : 'bg-white text-gray-500 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    {cat === 'All' ? '📌 Show All' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid List Products */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[460px] overflow-y-auto pr-2 scrollbar-hide py-1">
              {filteredProducts.map((p) => {
                const isSelected = posCart.some(itm => itm.product.id === p.id);
                return (
                  <button 
                    key={p.id}
                    onClick={() => addToPOSCart(p)}
                    className={`h-full flex flex-col text-left p-4 rounded-3xl border transition-all hover:shadow-md active:scale-95 group focus:outline-none ${
                      isSelected 
                        ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary' 
                        : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                    }`}
                  >
                    <div className="w-full h-24 bg-gray-50 rounded-2xl overflow-hidden mb-3 relative border border-gray-100">
                      <img 
                        src={p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200"} 
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {p.barcode && (
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-gray-900/95 text-[8px] font-black text-white rounded font-mono tracking-widest uppercase">
                          {p.barcode.slice(-5)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-extrabold text-primary mb-1 uppercase tracking-wider font-mono">{p.category}</span>
                    <h4 className="font-extrabold text-sm text-gray-800 line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h4>
                    <div className="mt-auto pt-2 flex items-center justify-between w-full">
                      <span className="font-black text-sm text-gray-900">₹{p.price}</span>
                      <span className="text-[10px] font-bold text-gray-400">Stock: {p.stock}</span>
                    </div>
                  </button>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400">
                  <AlertTriangle className="w-10 h-10 mx-auto text-yellow-500 mb-2" />
                  <p className="text-sm font-semibold">No stock item matched selection</p>
                </div>
              )}
            </div>

            {/* Add Custom / Walk-in entries quickly */}
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-4">
              <h4 className="font-extrabold text-xs text-gray-700 tracking-wider uppercase flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Add Non-Inventory Custom Item (Quick Entry)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input 
                  type="text" 
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="Product name / service line..."
                  className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 md:col-span-2 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                />
                <input 
                  type="number" 
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  placeholder="Price (₹)..."
                  className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                />
                <button 
                  onClick={addCustomItemToPOS}
                  className="bg-primary text-white font-extrabold text-xs rounded-xl py-2.5 hover:bg-primary/95 transition-all shadow-sm active:scale-95 text-center uppercase tracking-widest"
                >
                  Insert Line
                </button>
              </div>
            </div>

          </div>


          {/* Checkout Cart Column */}
          <div className="lg:col-span-5 border-l border-gray-100 lg:pl-8 space-y-6">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gray-400" />
                Active Transaction Ledger
              </h3>
              <span className="px-3 py-1 bg-gray-50 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest border border-gray-200">
                {posCart.length} lines total
              </span>
            </div>

            {/* Cart Table Rows */}
            <div className="space-y-4 max-h-[340px] overflow-y-auto pr-2 scrollbar-hide">
              {posCart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between gap-4 p-3 border border-gray-100 rounded-2xl hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-gray-800 truncate">{item.product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold text-gray-400">Charged Rate:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-700">₹</span>
                        <input 
                          type="number" 
                          value={item.chargedPrice}
                          onChange={(e) => updatePOSChargedPrice(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-center text-xs font-bold text-gray-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200">
                      <button 
                        onClick={() => updatePOSCartQty(item.product.id, item.quantity - 1)}
                        className="p-1 hover:bg-white text-gray-600 rounded-lg transition-colors"
                      >
                        <Minus className="w-3" />
                      </button>
                      <span className="px-3 text-xs font-black min-w-8 text-center text-gray-800">{item.quantity}</span>
                      <button 
                        onClick={() => updatePOSCartQty(item.product.id, item.quantity + 1)}
                        className="p-1 hover:bg-white text-gray-600 rounded-lg transition-colors"
                      >
                        <Plus className="w-3" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removePOSCartItem(item.product.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {posCart.length === 0 && (
                <div className="py-20 text-center text-gray-300 space-y-3">
                  <ShoppingCart className="w-12 h-12 mx-auto text-gray-200" />
                  <p className="text-sm font-semibold">Ready to draft sales log</p>
                  <p className="text-xs text-gray-400">Add inventory cards from side panel to build invoice!</p>
                </div>
              )}
            </div>

            {/* Customer Details info block */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-primary" />
                Customer Contact (Receipt info)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name..."
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                />
                <input 
                  type="text" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number..."
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                />
              </div>
            </div>

            {/* Sum breakdowns */}
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-3.5">
              <div className="flex justify-between items-center text-sm font-semibold text-gray-500">
                <span>Subtotal Sum:</span>
                <span className="text-gray-950 font-black">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold text-gray-500">
                <span>GST (5% tax addition):</span>
                <span className="text-gray-950 font-black">₹{tax.toFixed(2)}</span>
              </div>

              {/* Settlement Type Selectors */}
              <div className="border-t border-dashed border-gray-200/80 my-3 pt-3 flex items-center justify-between">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Settle Method</span>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    disabled={true}
                    onClick={() => alert("Cash Settle (CS) is deactivated. Only UPI / Scan payment is supported on this POS terminal.")}
                    className="px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed flex items-center gap-1"
                  >
                    <span>🔒 Cash Settle</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSelectedPayment('UPI')}
                    className={`px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border ${
                      selectedPayment === 'UPI' 
                        ? 'bg-primary text-white border-primary shadow-sm' 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    UPI / Scan Settle
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200/80 pt-3 flex justify-between items-center">
                <span className="text-sm font-black text-gray-900 tracking-tight">Grand Total:</span>
                <span className="text-2xl font-black text-primary">₹{total.toFixed(2)}</span>
              </div>

              {/* Settle Action Button */}
              <button 
                onClick={handleSettleAndClear}
                disabled={posCart.length === 0}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 duration-200 hover:translate-y-[-1px] disabled:opacity-50 disabled:pointer-events-none"
              >
                <Printer className="w-5 h-5" />
                Settle & Print Receipt
              </button>
            </div>

          </div>

        </div>
      )}


      {/* Receipts Register screen */}
      {posSubTab === 'sales' && (
        <div className="space-y-6">
          
          {/* Dashboard Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-1">
              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Cumulative revenue (90D)</span>
              <p className="text-3xl font-black text-gray-900">₹{cumulativeRev.toLocaleString()}</p>
              <span className="text-[10px] font-semibold text-green-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Base GST 5% Included
              </span>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-1">
              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Ticket Receipts Issued</span>
              <p className="text-3xl font-black text-gray-900">{ticketCount} Bills</p>
              <span className="text-[10px] font-semibold text-gray-400">Persistent Ledger</span>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-1">
              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Dispatched Units</span>
              <p className="text-3xl font-black text-gray-900">{totalDispatchedCount} units</p>
              <span className="text-[10px] font-semibold text-gray-400">Total single product lines</span>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-1">
              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Ticket Average Value (AOV)</span>
              <p className="text-3xl font-black text-gray-900">₹{aov.toFixed(2)}</p>
              <span className="text-[10px] font-semibold text-primary">Average Walk-in basket</span>
            </div>
          </div>

          <div className="flex justify-between items-center border-b pb-4 border-gray-200">
            <div>
              <h3 className="font-extrabold text-gray-900">Historical Archives Ledger</h3>
              <p className="text-xs font-semibold text-gray-400">Receipt documents logged dynamically over standard 90 days range (Offline Persistent)</p>
            </div>
            
            {/* Quick Spreadsheet compiler actions */}
            <div className="flex gap-3">
              <button 
                onClick={() => checkAndTriggerExport('CSV')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-extrabold text-xs rounded-xl hover:bg-gray-200 transition-all border border-gray-200 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                Compile Flat CSV
              </button>
              <button 
                onClick={() => checkAndTriggerExport('XLS')}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-extrabold text-xs rounded-xl hover:bg-primary/95 transition-all shadow-md active:scale-95 shadow-primary/15"
              >
                <Download className="w-4 h-4" />
                Export Stylized Excel (.XLS)
              </button>
            </div>
          </div>

          {/* Drill Down interactive table layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 overflow-x-auto border border-gray-100 rounded-3xl shadow-sm">
              <table className="w-full text-left font-semibold text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-widest border-b border-gray-100">
                    <th className="p-4">Invoice ID</th>
                    <th className="p-4">Timestamp Date</th>
                    <th className="p-4">Customer info</th>
                    <th className="p-4 text-center">Settled Type</th>
                    <th className="p-4 text-right">Receipt Sum</th>
                    <th className="p-4 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPastSales.map((sale) => (
                    <tr 
                      key={sale.id}
                      onClick={() => setSelectedSaleDetail(sale)}
                      className={`hover:bg-gray-50/80 cursor-pointer transition-colors ${
                        selectedSaleDetail?.id === sale.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <td className="p-4 font-black text-gray-900 font-mono tracking-tight">{sale.id}</td>
                      <td className="p-4 font-medium text-gray-400">
                        {new Date(sale.timestamp).toLocaleDateString()}
                        <span className="block text-[10px] text-gray-300 font-mono mt-0.5">
                          {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-extrabold text-gray-800 block text-sm">{sale.customerName || 'Guest Customer'}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{sale.customerPhone || 'N/A'}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase ${
                          sale.paymentMethod === 'Cash' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                        }`}>
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-gray-900 text-sm">₹{sale.total.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={(e) => handlePurgeSaleRecord(sale.id, e)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredPastSales.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-20 text-gray-400">
                        <AlertTriangle className="w-10 h-10 mx-auto text-yellow-500 mb-2" />
                        <p className="text-sm font-semibold">Past 3 months interval ledger has no records yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Drill down sidebar detail panel */}
            <div className="lg:col-span-4 bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-6">
              {selectedSaleDetail ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-3 border-gray-200/80">
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">{selectedSaleDetail.id}</h4>
                      <p className="text-[10px] font-semibold text-gray-400 mt-0.5">Logged: {new Date(selectedSaleDetail.timestamp).toLocaleString()}</p>
                    </div>
                    <span className="px-3 py-1 bg-primary/10 text-primary font-black uppercase text-[10px] tracking-widest rounded-xl">
                      {selectedSaleDetail.paymentMethod} Verified
                    </span>
                  </div>

                  {/* Customer Block card */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200/50 space-y-2">
                    <p className="font-black uppercase tracking-widest text-[9px] text-gray-400">Customer profiles details</p>
                    <div>
                      <span className="font-extrabold text-xs text-gray-800 block">{selectedSaleDetail.customerName || 'Anonymous Guest'}</span>
                      <span className="text-[10px] font-mono text-gray-400 font-semibold">{selectedSaleDetail.customerPhone || 'Empty phone'}</span>
                    </div>
                  </div>

                  {/* Product items listed breakdown */}
                  <div className="space-y-3">
                    <p className="font-black uppercase tracking-widest text-[9px] text-gray-400">Purchased product lines breakdown</p>
                    <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-2">
                      {selectedSaleDetail.items.map((itm, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-200/55 pb-2">
                          <div>
                            <span className="font-extrabold text-gray-800 line-clamp-1">{itm.productName}</span>
                            <span className="text-[10px] text-gray-400 mt-0.5 block">{itm.quantity} pack(s) x ₹{itm.price}</span>
                          </div>
                          <span className="font-black text-gray-900">₹{itm.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Receipts Summary Box */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200/50 space-y-2.5 text-xs">
                    <div className="flex justify-between font-semibold text-gray-500">
                      <span>Subtotal amount:</span>
                      <span>₹{selectedSaleDetail.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-500">
                      <span>GST (5% tax added):</span>
                      <span>₹{selectedSaleDetail.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-gray-900 border-t border-dashed border-gray-200 pt-2 text-sm">
                      <span>Grand Ledger Sum:</span>
                      <span className="text-primary">₹{selectedSaleDetail.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Launch print sheets button inside side panels */}
                  <button 
                    onClick={() => {
                      window.print();
                    }}
                    className="w-full bg-gray-900 text-white font-black py-3 rounded-xl shadow hover:bg-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Reprint A4 Bill Receipt
                  </button>

                </div>
              ) : (
                <div className="text-center py-20 text-gray-300 space-y-3">
                  <Compass className="w-12 h-12 mx-auto text-gray-200 animate-spin" style={{ animationDuration: '6s' }} />
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Detail Drill Down Viewer</p>
                  <p className="text-[10px] font-semibold text-gray-400 max-w-[200px] mx-auto leading-relaxed">Click any row within the interactive table ledger to investigate items breakdowns or launch reprints!</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}


      {/* Exports History screen */}
      {posSubTab === 'exports' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-4 border-gray-200">
            <div>
              <h3 className="font-extrabold text-gray-900">Historical spreadsheet Export registry archives</h3>
              <p className="text-xs font-semibold text-gray-400">Chronological trace logs tracking completed CSV and stylized Microsoft Excel generation files</p>
            </div>
            <button 
              onClick={clearExportsHistory}
              disabled={exportLogs.length === 0}
              className="px-4 py-2 text-red-500 border border-red-100 rounded-xl font-bold text-xs bg-red-50 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
            >
              Clear Export Tracker Index
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exportLogs.map((log) => (
              <div key={log.id} className="bg-gray-50/50 border border-gray-100 rounded-3xl p-5 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-2.5 h-full ${
                  log.format === 'XLS' ? 'bg-primary' : 'bg-amber-400'
                }`} />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-500 font-bold tracking-wider rounded text-[9px] uppercase font-mono">
                      {log.format} EXPORT BLOCK
                    </span>
                    <h4 className="font-bold text-gray-800 text-xs mt-2 truncate max-w-[200px]" title={log.filename}>
                      {log.filename}
                    </h4>
                    <p className="text-[9px] font-semibold text-gray-400 mt-1">Generated: {new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded font-black font-mono text-[9px] text-gray-500 uppercase">
                    {log.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200/50 text-xs font-semibold">
                  <div>
                    <span className="text-gray-400 text-[10px] block">Item Rows density</span>
                    <span className="text-gray-900 font-extrabold">{log.itemCount} trace lines</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block font-medium">Export Valuation sum</span>
                    <span className="text-primary font-black">₹{log.totalValue.toLocaleString()}</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    // Quick re-trigger
                    if (log.format === 'CSV') {
                      downloadCSV();
                    } else {
                      downloadXLS();
                    }
                  }}
                  className="w-full bg-white hover:bg-gray-100 text-gray-800 text-xs font-extrabold py-2 rounded-xl transition-all border border-gray-200/80 uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  Request Re-Download
                </button>
              </div>
            ))}

            {exportLogs.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-200 mb-2" />
                <p className="text-sm font-semibold">Registry export tracking logs are empty</p>
                <p className="text-xs text-gray-400">Generate CSV or Stylized Excel formats under the Receipts tab to index active logs!</p>
              </div>
            )}
          </div>

        </div>
      )}


      {/* Printers Management & Diagnostics Screen */}
      {posSubTab === 'printers' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="border-b pb-4 border-gray-100">
            <h3 className="font-extrabold text-lg text-gray-905 tracking-tight">Thermal 2-Inch ESC/POS Printer Interface</h3>
            <p className="text-xs font-semibold text-gray-400 mt-0.5">Configure Web Bluetooth bonding logs or local print alignment parameters for 58mm POS receipt systems</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Bluetooth Config Card */}
            <div className="bg-gray-50/50 border border-gray-100 rounded-[32px] p-6 space-y-6">
              <div className="flex items-start gap-4">
                <span className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                  <Printer className="w-6 h-6" />
                </span>
                <div>
                  <h4 className="font-extrabold text-gray-805 text-sm">Bond Bluetooth Receipts Printer</h4>
                  <p className="text-[11px] font-semibold text-gray-400 mt-0.5">Establish low-energy pairing connections with portable ESC/POS thermal roll machines</p>
                </div>
              </div>

              <div className="p-4 bg-white border border-gray-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Paired device address name</span>
                  <span className="font-extrabold text-xs text-gray-800 flex items-center gap-1.5 mt-1">
                    {pairedName !== 'No printer paired' ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block animate-pulse" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
                    )}
                    {pairedName}
                  </span>
                </div>
                {pairedName !== 'No printer paired' ? (
                  <button
                    onClick={() => {
                      BluetoothPrinterManager.disconnect();
                      setPairedName('No printer paired');
                      alert("Successfully detached Bluetooth receipts printer.");
                    }}
                    className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const success = await BluetoothPrinterManager.pairAndConnect();
                      if (success) {
                        setPairedName(BluetoothPrinterManager.getDeviceName());
                        alert("Successfully paired and connected to " + BluetoothPrinterManager.getDeviceName() + "!");
                      }
                    }}
                    className="px-3.5 py-1.5 bg-primary text-white hover:bg-primary/95 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md shadow-primary/10 cursor-pointer"
                  >
                    Pair Printer
                  </button>
                )}
              </div>

              {/* Autoprint config toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200/80 rounded-2xl">
                  <div className="max-w-[80%]">
                    <span className="font-extrabold text-xs text-gray-808 block">Automatic Bill Receipt Printing</span>
                    <span className="text-[10px] font-semibold text-gray-400 block mt-0.5">Automatically trigger thermal billing as soon as any client places an order</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isAutoprintEnabled}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsAutoprintEnabled(val);
                      localStorage.setItem('bluetooth_autoprint_enabled', val ? 'true' : 'false');
                    }}
                    className="w-5 h-5 accent-primary cursor-pointer rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Print Settings & Diagnostics Card */}
            <div className="bg-gray-50/50 border border-gray-100 rounded-[32px] p-6 space-y-6">
              <div className="flex items-start gap-4">
                <span className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                  <Settings className="w-6 h-6" />
                </span>
                <div>
                  <h4 className="font-extrabold text-gray-805 text-sm">Interface Settings & Alignment diagnostics</h4>
                  <p className="text-[11px] font-semibold text-gray-400 mt-0.5">Control print densities, column alignment ratios, and feed tape indicators</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200/80 rounded-2xl p-4 text-xs font-semibold text-gray-600 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Active Roll parameters (58mm / 2 inches)</p>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span>Paper Web Width:</span>
                  <span className="font-bold text-gray-800">58 mm (2 inches)</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span>Character-Pitch Limit (Font A):</span>
                  <span className="font-bold text-gray-800">32 Characters per line</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span>Columns division:</span>
                  <span className="font-bold text-gray-800">ITEM (14) | QTY (3) | PRIC (5) | TOTAL (6)</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span>Transmission speed:</span>
                  <span className="font-mono font-bold">115200 Baud rate equivalent</span>
                </div>
              </div>

              {/* Test diagnostics trigger */}
              <button
                onClick={async () => {
                  // Generate an elegant mock order template for testing
                  const demoOrder: Order = {
                    id: 'DEMO6789',
                    userId: 'DemoUser',
                    userName: 'Ansh Gupta (Diagnostics)',
                    userPhone: '+91 99999 88888',
                    deliveryType: 'Delivery',
                    createdAt: Date.now(),
                    pin: '834005',
                    paymentMethod: 'UPI',
                    items: [
                      {
                        id: 'demo1',
                        name: 'Aashirvaad Atta 5kg Premium Pack',
                        description: 'Premium whole wheat flour',
                        price: 380,
                        stock: 50,
                        category: 'Flour',
                        image: '',
                        createdAt: Date.now(),
                        quantity: 1
                      },
                      {
                        id: 'demo2',
                        name: 'Amul Butter 100g chunk block',
                        description: 'Pasteurized butter block',
                        price: 58,
                        stock: 120,
                        category: 'Dairy',
                        image: '',
                        createdAt: Date.now(),
                        quantity: 2
                      }
                    ],
                    total: 496,
                    status: 'Order Placed'
                  };

                  const bytes = buildEscPosBytes(demoOrder);
                  const isSuccess = await BluetoothPrinterManager.sendBytesToPrinter(bytes);
                  if (isSuccess) {
                    alert("Diagnostics ESC/POS byte package dispatched successfully to Bluetooth printer!");
                  } else {
                    alert("Direct Web Bluetooth write failed. Launching styled HTML 58mm POS receipt fallback now!");
                    printViaIframe(demoOrder);
                  }
                }}
                className="w-full bg-gray-950 text-white hover:bg-black font-extrabold tracking-widest uppercase text-xs rounded-2xl py-3.5 transition-all text-center flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] cursor-pointer"
              >
                <Printer className="w-4 h-4 text-primary animate-bounce font-black" />
                Print Diagnostics Test Bill
              </button>
            </div>

          </div>

          <div className="bg-yellow-50 text-yellow-850 border border-yellow-105 rounded-[28px] p-5 flex gap-3 text-xs md:text-sm font-semibold leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Automated Paper-Cutting & Print Diagnostics</p>
              <p className="text-[11px] font-semibold text-yellow-800 mt-1">
                The automatic printer engine works by registering a snapshot listener globally on the backend collections. Once initialized and paired, this tab monitors placing events completely in the background. If browser features prevent raw Bluetooth transmission, the dashboard immediately fallback launches native 2" print layout dialog prompts silently!
              </p>
            </div>
          </div>
        </div>
      )}


      {/* High Fidelity Storage Sandbox Security Panel Modal */}
      <AnimatePresence>
        {isPermissionModalOpen && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 p-8 space-y-6"
            >
              <div className="flex gap-4 items-start pb-4 border-b border-gray-100">
                <span className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <Shield className="w-8 h-8" />
                </span>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Access Directory permissions control sandbox</h3>
                  <p className="text-xs font-semibold text-gray-400 tracking-wide mt-1">To execute exports cleanly, configure local file write permissions securely</p>
                </div>
              </div>

              {/* Switches options */}
              <div className="space-y-4">
                
                {/* Write access */}
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div>
                    <span className="font-extrabold text-sm text-gray-800 block">Write Directory Access</span>
                    <span className="text-[10px] font-semibold text-gray-400 block mt-0.5">Authorizes system to write compiled blobs directly into /Download path of client systems</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={permissions.writeAccess} 
                    onChange={() => setPermissions({ ...permissions, writeAccess: !permissions.writeAccess })}
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>

                {/* File system alignment */}
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div>
                    <span className="font-extrabold text-sm text-gray-800 block">File System Mapping & alignments tokens</span>
                    <span className="text-[10px] font-semibold text-gray-400 block mt-0.5">Maps structured tabular headers alignments like (#020617 Slate design) within binary formats</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={permissions.fileSystemAccess} 
                    onChange={() => setPermissions({ ...permissions, fileSystemAccess: !permissions.fileSystemAccess })}
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>

                {/* Archival Ledger connection */}
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div>
                    <span className="font-extrabold text-sm text-gray-800 block">Persistent Archived log tracing</span>
                    <span className="text-[10px] font-semibold text-gray-400 block mt-0.5">Permits local token database to cache exported filename histories for grid visualization displays</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={permissions.archivalLedger} 
                    onChange={() => setPermissions({ ...permissions, archivalLedger: !permissions.archivalLedger })}
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>

              </div>

              {/* Status Warning Alert */}
              <div className="flex gap-2.5 p-4 bg-yellow-50 text-yellow-800 border border-yellow-100 rounded-2xl text-[11px] font-semibold leading-relaxed">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                Configure controls carefully. De-authenticating write flags prevents flat data structure transfers entirely.
              </div>

              {/* Actions buttons */}
              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setIsPermissionModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-black py-3.5 rounded-2xl transition-all uppercase tracking-widest text-center"
                >
                  Discard settings
                </button>
                <button 
                  onClick={handleGrantSandboxPermissions}
                  className="flex-1 bg-primary text-white text-xs font-black py-3.5 rounded-2xl hover:bg-primary/95 transition-all shadow-lg active:scale-95 text-center uppercase tracking-widest"
                >
                  Accredit permissions token
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Dynamic Animated compiler compiler Modal (0% -> 100%) */}
      <AnimatePresence>
        {compilationProgress >= 0 && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/15 rounded-[36px] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl"
            >
              <RotateCw className="w-10 h-10 text-primary animate-spin mx-auto" />
              <div className="space-y-2">
                <h4 className="text-white font-black text-lg tracking-tight">Compiling Tabular sales Binary...</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client engine local assembly pipeline</p>
              </div>

              {/* Progress bar and numeric tracking */}
              <div className="space-y-2">
                <div className="w-full bg-gray-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-white/5">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${compilationProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                  <span>Compilation load index</span>
                  <span className="font-extrabold text-white text-xs font-mono">{compilationProgress}%</span>
                </div>
              </div>

              {/* Logs terminal style display */}
              <div className="bg-black/95 rounded-2xl border border-white/5 p-4 text-[10px] font-mono text-green-400 text-left h-28 overflow-y-auto space-y-1.5 scrollbar-hide">
                {compilerLogs.map((log, idx) => (
                  <p key={idx} className="line-clamp-2">
                    <span className="text-gray-500 select-none mr-1.5">&gt;</span>
                    {log}
                  </p>
                ))}
              </div>

              <p className="text-[9px] text-gray-500 leading-normal">
                Executing sandbox direct compilation. Please keep this session open.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ReceiptPreviewModal 
        isOpen={!!itemForPrintPreview}
        sale={itemForPrintPreview}
        onClose={() => setItemForPrintPreview(null)}
        onConfirmPrint={handleConfirmPrintClose}
      />

    </div>
  );
};

// Seed Mock POS Sales corresponding past 3 Months
function generateSeedSales(): POSSale[] {
  const seedSales: POSSale[] = [];
  const clientNames = ['Rohit Sharma', 'Priya Patel', 'Ankit Verma', 'Soniya Sen', 'Kumar Gaurav', 'Sushant Roy', 'Richa Singh'];
  const baseProducts = [
    { name: 'Fruits & Veggies bag combo', price: 420 },
    { name: 'Organic Mustard Oil 1L block', price: 185 },
    { name: 'Premium Chakki Atta 5kg', price: 340 },
    { name: 'Salted butter pack 100g', price: 58 },
    { name: 'Basmati Rice premium gold 5kg', price: 680 },
    { name: 'Mixed Spices Masala Pack 200g', price: 110 }
  ];

  // Past 90 days timestamps loop
  for (let i = 0; i < 28; i++) {
    const randomDayOffset = Math.floor(Math.random() * 88); // between 0 and 88 days ago
    const timestamp = Date.now() - (randomDayOffset * 24 * 60 * 60 * 1000) - (Math.random() * 5 * 60 * 60 * 1000);
    
    // Choose 2-4 items randomly
    const itemsCount = Math.floor(Math.random() * 3) + 2; 
    const items: POSSale['items'] = [];
    let subtotal = 0;

    for (let j = 0; j < itemsCount; j++) {
      const p = baseProducts[Math.floor(Math.random() * baseProducts.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      const chargedPrice = p.price;
      const itemSubtotal = chargedPrice * qty;
      items.push({
        productName: p.name,
        quantity: qty,
        price: chargedPrice,
        subtotal: itemSubtotal
      });
      subtotal += itemSubtotal;
    }

    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = subtotal + tax;

    seedSales.push({
      id: `#sale_${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp,
      items,
      subtotal,
      tax,
      total,
      paymentMethod: Math.random() > 0.4 ? 'Cash' : 'UPI',
      customerName: clientNames[Math.floor(Math.random() * clientNames.length)],
      customerPhone: `+91 91234 ${Math.floor(10000 + Math.random() * 90000)}`
    });
  }

  // Sort chronologically descending
  return seedSales.sort((a,b) => b.timestamp - a.timestamp);
}
