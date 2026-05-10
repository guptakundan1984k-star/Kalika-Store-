import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function PageNotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <Helmet>
        <title>404 - Page Not Found | Kalika Store</title>
      </Helmet>
      
      <div className="relative">
        <div className="text-[12rem] font-black text-gray-100 select-none">404</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Home className="w-12 h-12 text-primary" />
          </div>
        </div>
      </div>

      <h1 className="text-4xl font-black text-gray-900 mt-8 mb-4 uppercase italic tracking-tighter">
        Lost in Shopping?
      </h1>
      
      <p className="text-gray-500 max-w-md mb-12 font-medium">
        The page you're looking for doesn't exist or has been moved to a new collection.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-100 text-gray-900 rounded-3xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
          Go Back
        </button>
        
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95"
        >
           Return Home
        </button>
      </div>
    </div>
  );
}
