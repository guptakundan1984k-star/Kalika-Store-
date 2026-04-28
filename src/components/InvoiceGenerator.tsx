import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Order, CartItem } from '../types';
import { FileText, Download, Loader2 } from 'lucide-react';

interface InvoiceGeneratorProps {
  order: Order;
  onClose?: () => void;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ order }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = React.useState(false);

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;
    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageElements = invoiceRef.current.children;
      
      for (let i = 0; i < pageElements.length; i++) {
        const canvas = await html2canvas(pageElements[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`kalika_store_invoice_${order.id.slice(-6)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGenerating(false);
    }
  };

  const itemsPerPage = 15;
  const pages = Math.ceil(order.items.length / itemsPerPage) || 1;

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Hidden invoice for PDF generation */}
      <div className="fixed -left-[2000px] top-0">
        <div ref={invoiceRef} className="w-[210mm] bg-white p-0">
          {Array.from({ length: pages }).map((_, pageIndex) => (
            <div key={pageIndex} className="relative min-h-[297mm] flex flex-col p-12 overflow-hidden shadow-none print:shadow-none">
              {/* Header */}
              <div className="flex flex-col items-center mb-16 mt-8">
                <div className="relative">
                  {/* Rectangle BG for logo text as requested */}
                  <div className="absolute inset-0 bg-gray-100 -rotate-1 rounded-sm scale-110 -z-10" />
                  <h1 className="text-7xl font-black tracking-tighter text-gray-900 px-6 py-2">KALIKA STORE</h1>
                </div>
              </div>

              {/* Info Section */}
              <div className="grid grid-cols-2 gap-12 mb-12 text-gray-800">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Date:</h3>
                    <p className="text-sm font-bold">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Billed to:</h3>
                    <p className="text-sm font-bold">{order.userName}</p>
                    <p className="text-xs text-gray-600 italic mt-1">{order.address?.manual || 'Address not provided'}</p>
                    <p className="text-xs text-gray-600">{order.userPhone}</p>
                  </div>
                </div>
                <div className="space-y-4 text-right">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">From:</h3>
                    <p className="text-sm font-bold">KALIKA STORE</p>
                    <p className="text-xs text-gray-600 leading-relaxed uppercase">
                      OPP. KRISHI BAZAAR, BESIDE<br />
                      BANK OF INDIA, 834005-<br />
                      JHARKHAND
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex-grow">
                <table className="w-full text-left">
                  <thead className="bg-[#E5E7EB] text-[#374151]">
                    <tr>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Item</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-center">Quantity</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-center">Price</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-800">
                    {order.items.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 italic font-medium">
                        <td className="py-4 px-6 text-sm">{item.name}</td>
                        <td className="py-4 px-6 text-sm text-center">{item.quantity}</td>
                        <td className="py-4 px-6 text-sm text-center">{item.price}</td>
                        <td className="py-4 px-6 text-sm text-right font-bold">{item.price * item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer and Totals (Only on last page) */}
                {pageIndex === pages - 1 && (
                  <div className="mt-8 space-y-8">
                    <div className="flex justify-end gap-12 items-center">
                      <span className="text-sm font-black uppercase tracking-widest">Total</span>
                      <span className="text-2xl font-black">₹{order.total}</span>
                    </div>

                    <div className="pt-8 border-t border-gray-100 flex justify-between items-start">
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Payment method:</h3>
                        <p className="text-sm font-bold">{order.paymentMethod || 'Cash'}</p>
                      </div>
                      <p className="text-sm font-bold italic text-gray-400">Thank you for choosing us!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Wavy Footer Overlay (Replicating Image) */}
              <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none overflow-hidden">
                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <path d="M0 50 Q 25 10 50 50 T 100 30 V 100 H 0 Z" fill="#D1D5DB" opacity="0.5" />
                    <path d="M0 60 Q 30 20 60 60 T 100 40 V 100 H 0 Z" fill="#9CA3AF" opacity="0.5" />
                    <path d="M0 80 Q 40 40 80 80 T 100 60 V 100 H 0 Z" fill="#374151" />
                 </svg>
              </div>

              {/* Page Number */}
              <div className="absolute bottom-4 right-8 text-[10px] font-black text-gray-400 uppercase">
                Page {pageIndex + 1} of {pages}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={downloadPDF}
        disabled={generating}
        className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
      >
        {generating ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Download className="w-5 h-5" />
        )}
        Download Invoice (PDF)
      </button>
    </div>
  );
};
