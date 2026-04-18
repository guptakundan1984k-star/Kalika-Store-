import React from 'react';
import { PaperBillUploader } from '../components/PaperBillUploader';
import { motion } from 'motion/react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Product } from '../types';

interface BillPageProps {
  products: Product[];
  onAddItems: (items: { product: Product, quantity: number }[]) => void;
}

export default function BillPage({ products, onAddItems }: BillPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-secondary px-6 py-12 text-white">
        <div className="max-w-7xl mx-auto space-y-4">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Upload Paper Bill</h1>
          </div>
          <p className="text-white/60 font-medium max-w-2xl">
            Upload a photo of your handwritten grocery list or an old bill, and we'll process it for you.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <PaperBillUploader products={products} onAddItems={onAddItems} />
        </div>
      </div>
    </div>
  );
}
