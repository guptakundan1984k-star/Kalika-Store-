import React from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useNavigate } from 'react-router-dom';
import { db, collection, getDocs, query, where } from '../firebase';
import { Product } from '../types';

const ScanPage: React.FC = () => {
  const navigate = useNavigate();

  const handleScan = async (barcode: string) => {
    try {
      // Find product by barcode in Firestore
      const q = query(collection(db, 'products'), where('barcode', '==', barcode));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const product = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Product;
        navigate(`/product/${product.id}`);
      } else {
        // Fallback to text search if barcode not found as field
        // Some systems store barcode in name or just don't have it
        alert(`Barcode ${barcode} scanned. No matching product found in our database.`);
        navigate('/products');
      }
    } catch (error) {
      console.error("Scan processing error:", error);
      navigate('/products');
    }
  };

  return (
    <div className="pt-20">
      <BarcodeScanner 
        onScan={handleScan}
        onClose={() => navigate(-1)}
      />
    </div>
  );
};

export default ScanPage;
