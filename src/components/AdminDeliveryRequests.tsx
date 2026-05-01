import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, deleteDoc, doc } from '../firebase';
import { MapPin, Clock, Trash2, ExternalLink, User, Phone, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DeliveryRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  location: string;
  coordinates?: string;
  mapsUrl: string;
  type: string;
  createdAt: number;
}

export const AdminDeliveryRequests: React.FC = () => {
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'delivery_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryRequest)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this request?')) {
      await deleteDoc(doc(db, 'delivery_requests', id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">Delivery Coordination</h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Real-time express delivery interests</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl text-primary font-black text-xs uppercase tracking-widest">
          {requests.length} Active Requests
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white p-12 rounded-[40px] border border-dashed border-gray-200 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No recent coordination requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {requests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900">{req.userName}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(req.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(req.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="w-4 h-4 text-primary" />
                    <a href={`tel:${req.userPhone}`} className="text-xs font-bold hover:underline">{req.userPhone}</a>
                  </div>
                  <div className="flex items-start gap-3 text-gray-600">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold leading-relaxed text-gray-900">{req.location}</p>
                      {req.coordinates && (
                        <p className="text-[9px] font-mono text-gray-400">GPS: {req.coordinates}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={req.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Map Link
                  </a>
                  <button
                    onClick={() => handleDelete(req.id)}
                    className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Done
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
