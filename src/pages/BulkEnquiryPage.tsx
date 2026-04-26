import React, { useState, useEffect } from 'react';
import { UserProfile, BulkEnquiry } from '../types';
import { Briefcase, Send, Phone, MessageSquare, CheckCircle, Clock, FileText, Upload, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, onSnapshot, query, where, ref, uploadBytes, getDownloadURL, storage } from '../firebase';
import { PageLoader } from '../components/PageLoader';

interface BulkEnquiryPageProps {
  user: UserProfile;
}

const BulkEnquiryPageContent: React.FC<BulkEnquiryPageProps> = ({ user }) => {
  const [bulkEnquiries, setBulkEnquiries] = useState<BulkEnquiry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    message: '',
    phone: user.phone || '',
    billUrl: ''
  });
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billPreview, setBillPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBillFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBillPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadBill = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `bulk_enquiry_bills/${user.uid}_${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  useEffect(() => {
    if (!user.uid) return;
    const q = query(collection(db, 'bulk_enquiries'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBulkEnquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BulkEnquiry)));
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.uid) return;
    setIsSubmitting(true);
    try {
      let billUrl = '';
      if (billFile) {
        setIsUploading(true);
        billUrl = await uploadBill(billFile);
        setIsUploading(false);
      }

      const enquiry = {
        userId: user.uid,
        name: user.name,
        email: user.email,
        phone: formData.phone,
        storeName: formData.storeName,
        message: formData.message,
        billUrl,
        status: 'Pending',
        createdAt: Date.now()
      };
      await addDoc(collection(db, 'bulk_enquiries'), enquiry);
      setFormData({ storeName: '', message: '', phone: user.phone || '', billUrl: '' });
      setBillFile(null);
      setBillPreview(null);
      alert("Bulk Enquiry submitted successfully. We will contact you soon.");
    } catch (error) {
      console.error("Error submitting bulk enquiry:", error);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary mx-auto shadow-inner">
            <Briefcase className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Bulk Enquiry (Shops only)</h1>
          <p className="text-gray-500 font-medium max-w-lg mx-auto">
            Wholesale, institutions, and bulk orders. Tell us your requirements and we'll get back to you with the best rates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Store / Business Name</label>
                <input 
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="e.g. My Awesome Cafe"
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Your Phone Number"
                    className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Requirements</label>
                <textarea 
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  placeholder="Tell us what you need in bulk..."
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload Paper Bill (Optional)</label>
                {!billPreview ? (
                  <div className="relative group">
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group-hover:border-primary/20 transition-all">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-300 group-hover:text-primary shadow-sm">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Click or drag paper bill photo</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm aspect-video bg-gray-100">
                    <img src={billPreview} alt="Bill Preview" className="w-full h-full object-contain" />
                    <button 
                      onClick={() => { setBillFile(null); setBillPreview(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Selected
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={isSubmitting || isUploading}
                className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {billFile ? 'Submit with Bill' : 'Submit Enquiry'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Past Enquiries */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Recent Enquiries
            </h3>
            <div className="space-y-4">
              {bulkEnquiries.length === 0 ? (
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 border-dashed text-center">
                  <p className="text-gray-400 font-bold italic">No enquiries yet.</p>
                </div>
              ) : (
                bulkEnquiries.map((enquiry) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={enquiry.id}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-gray-900">{enquiry.storeName}</h4>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                        enquiry.status === 'Pending' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'
                      }`}>
                        {enquiry.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium line-clamp-2">{enquiry.message}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {new Date(enquiry.createdAt).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BulkEnquiryPage: React.FC<BulkEnquiryPageProps> = (props) => (
  <PageLoader>
    <BulkEnquiryPageContent {...props} />
  </PageLoader>
);
