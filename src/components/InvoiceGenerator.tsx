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
          backgroundColor: '#ffffff'
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
      alert('Error generating PDF. Please ensure your browser supports canvas rendering.');
    } finally {
      setGenerating(false);
    }
  };

  const itemsPerPage = 15;
  const pages = Math.ceil(order.items.length / itemsPerPage) || 1;

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Hidden invoice for PDF generation */}
      <div className="fixed -left-[2000px] top-0 overflow-hidden" style={{ width: '210mm' }}>
          <div ref={invoiceRef} className="bg-white">
          {Array.from({ length: pages }).map((_, pageIndex) => (
            <div key={pageIndex} className="relative flex flex-col overflow-hidden" style={{ width: '210mm', height: '297mm', backgroundColor: '#ffffff', padding: '48px', color: '#111827' }}>
              {/* Header */}
              <div className="flex flex-col items-center mb-16 mt-8">
                <div className="relative">
                  <div className="absolute inset-0 rounded-sm scale-110" style={{ backgroundColor: '#F3F4F6', transform: 'rotate(-1deg) scale(1.1)', zIndex: 0 }} />
                  <h1 className="text-7xl font-black tracking-tighter px-6 py-2 relative" style={{ color: '#111827', zIndex: 1, margin: 0 }}>KALIKA STORE</h1>
                </div>
              </div>

              {/* Info Section */}
              <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="space-y-4">
                  <div>
                    <h3 style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: '#9CA3AF' }}>Date:</h3>
                    <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111827' }}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: '#9CA3AF' }}>Billed to:</h3>
                    <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111827' }}>{order.userName}</p>
                    <p style={{ fontSize: '12px', fontStyle: 'italic', marginTop: '4px', margin: 0, color: '#4B5563' }}>{order.address?.manual || 'Address not provided'}</p>
                    <p style={{ fontSize: '12px', margin: 0, color: '#4B5563' }}>{order.userPhone}</p>
                  </div>
                </div>
                <div className="space-y-4 text-right">
                  <div>
                    <h3 style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: '#9CA3AF' }}>From:</h3>
                    <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111827' }}>KALIKA STORE</p>
                    <p style={{ fontSize: '12px', lineHeight: 1.5, textTransform: 'uppercase', margin: 0, color: '#4B5563' }}>
                      OPP. KRISHI BAZAAR, BESIDE<br />
                      BANK OF INDIA, 834005-<br />
                      JHARKHAND
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ flexGrow: 1 }}>
                <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#E5E7EB' }}>
                      <th style={{ padding: '16px 24px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#374151' }}>Item</th>
                      <th style={{ padding: '16px 24px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', color: '#374151' }}>Quantity</th>
                      <th style={{ padding: '16px 24px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', color: '#374151' }}>Price</th>
                      <th style={{ padding: '16px 24px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right', color: '#374151' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#1F2937', fontWeight: 500, fontStyle: 'italic' }}>{item.name}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', textAlign: 'center', color: '#1F2937' }}>{item.quantity}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', textAlign: 'center', color: '#1F2937' }}>₹{item.price}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', textAlign: 'right', fontWeight: 700, color: '#1F2937' }}>₹{item.price * item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer and Totals (Only on last page) */}
                {pageIndex === pages - 1 && (
                  <div style={{ marginTop: '32px' }}>
                    <div className="flex justify-end items-center" style={{ gap: '48px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#111827' }}>Total</span>
                      <span style={{ fontSize: '24px', fontWeight: 900, color: '#111827' }}>₹{order.total}</span>
                    </div>

                    <div style={{ paddingTop: '32px', marginTop: '32px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: '#9CA3AF' }}>Payment method:</h3>
                        <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111827' }}>{order.paymentMethod || 'Cash'}</p>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 700, fontStyle: 'italic', margin: 0, color: '#9CA3AF' }}>Thank you for choosing us!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Wavy Footer Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none" style={{ overflow: 'hidden' }}>
                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <path d="M0 50 Q 25 10 50 50 T 100 30 V 100 H 0 Z" fill="#D1D5DB" />
                    <path d="M0 60 Q 30 20 60 60 T 100 40 V 100 H 0 Z" fill="#9CA3AF" />
                    <path d="M0 80 Q 40 40 80 80 T 100 60 V 100 H 0 Z" fill="#374151" />
                 </svg>
              </div>

              {/* Page Number */}
              <div className="absolute bottom-4 right-8" style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#9CA3AF' }}>
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
