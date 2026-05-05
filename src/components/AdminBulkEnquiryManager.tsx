import React from 'react';
import { 
  Briefcase, Mail, Phone, MessageSquare, 
  Clock, CheckCircle, XCircle, Search, Filter,
  ExternalLink, Eye, Trash2, Loader2, Sparkles, User, ChevronRight, ShoppingBag
} from 'lucide-react';
import { BulkEnquiry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db, doc, updateDoc, deleteDoc, handleFirestoreError, OperationType, collection, onSnapshot, query, orderBy } from '../firebase';

export const AdminBulkEnquiryManager: React.FC = () => {
  const [enquiries, setEnquiries] = React.useState<BulkEnquiry[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = React.useState<BulkEnquiry | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'bulk_enquiries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEnquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BulkEnquiry)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bulk_enquiries', false);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectEnquiry = async (enquiry: BulkEnquiry) => {
    setSelectedEnquiry(enquiry);
    if (!enquiry.isRead) {
      try {
        await updateDoc(doc(db, 'bulk_enquiries', enquiry.id), { isRead: true });
      } catch (e) {
        console.error("Failed to mark as read", e);
      }
    }
  };

  const handleUpdateStatus = async (id: string, status: BulkEnquiry['status']) => {
    try {
      await updateDoc(doc(db, 'bulk_enquiries', id), { status });
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
    try {
      await deleteDoc(doc(db, 'bulk_enquiries', id));
      if (selectedEnquiry?.id === id) setSelectedEnquiry(null);
    } catch (e) {
      console.error("Failed to delete enquiry", e);
    }
  };

  const filteredEnquiries = enquiries.filter(e => 
    e.storeName.toLowerCase().includes(search.toLowerCase()) ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total Inquiries', value: enquiries.length, color: 'primary', icon: Briefcase },
    { label: 'Pending', value: enquiries.filter(e => e.status === 'Pending').length, color: 'orange', icon: Clock },
    { label: 'Completed', value: enquiries.filter(e => e.status === 'Closed').length, color: 'green', icon: CheckCircle },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">Loading Business Inquiries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Bulk Inquiries</h2>
        <p className="text-sm text-gray-500 font-medium">Manage and respond to store owners and bulk orders.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${stat.color === 'primary' ? 'primary' : stat.color}-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`} />
            <div className="relative z-10">
              <div className={`w-12 h-12 bg-${stat.color === 'primary' ? 'primary' : stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color === 'primary' ? 'primary' : stat.color}-500 mb-4`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden min-h-[500px]">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by store name, person, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:text-primary transition-all active:scale-95">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-4 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20 hover:bg-black transition-all active:scale-95">
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-1/4">Business Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Message Summary</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEnquiries.map((enquiry) => (
                <tr 
                  key={enquiry.id} 
                  onClick={() => handleSelectEnquiry(enquiry)}
                  className="group hover:bg-gray-50/50 transition-all cursor-pointer relative"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      {!enquiry.isRead && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
                      )}
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm tracking-tight ${!enquiry.isRead ? 'font-black text-gray-900' : 'font-bold text-gray-600'}`}>{enquiry.storeName}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(enquiry.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                        <User className="w-3 h-3 text-primary" />
                        {enquiry.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                        <Mail className="w-3 h-3" />
                        {enquiry.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs text-gray-600 line-clamp-1 max-w-[200px] italic">"{enquiry.message}"</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      enquiry.status === 'Pending' ? 'bg-orange-100 text-orange-600' :
                      enquiry.status === 'Contacted' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {enquiry.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(enquiry.id); }}
                        className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2.5 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all active:scale-95">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEnquiries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-12 h-12 text-gray-100" />
                      <p className="text-lg font-black text-gray-300 tracking-tight uppercase">No matching inquiries found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enquiry Detail Modal */}
      <AnimatePresence>
        {selectedEnquiry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEnquiry(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-10 bg-indigo-600 text-white relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex items-center justify-between mb-8">
                  <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-xl">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-2 bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20">
                      {selectedEnquiry.status}
                    </span>
                    <button onClick={() => setSelectedEnquiry(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95">
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="relative z-10 space-y-1">
                  <h3 className="text-4xl font-black tracking-tight">{selectedEnquiry.storeName}</h3>
                  <p className="text-indigo-100 font-bold uppercase tracking-[0.2em] text-xs">Business Inquiry Details</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Person</p>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <User className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-gray-900">{selectedEnquiry.name}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Submission Date</p>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-gray-900">{new Date(selectedEnquiry.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Options</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a 
                      href={`mailto:${selectedEnquiry.email}`}
                      className="flex items-center justify-between p-6 bg-blue-50 text-blue-600 rounded-[32px] border border-blue-100 hover:bg-blue-600 hover:text-white transition-all group shadow-sm hover:shadow-xl hover:shadow-blue-600/10 active:scale-95"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-blue-500">
                          <Mail className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Send Email</p>
                          <p className="text-xs font-black truncate max-w-[150px]">{selectedEnquiry.email}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5" />
                    </a>
                    <a 
                      href={`tel:${selectedEnquiry.phone}`}
                      className="flex items-center justify-between p-6 bg-green-50 text-green-600 rounded-[32px] border border-green-100 hover:bg-green-600 hover:text-white transition-all group shadow-sm hover:shadow-xl hover:shadow-green-600/10 active:scale-95"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-green-500">
                          <Phone className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Call Now</p>
                          <p className="text-xs font-black">{selectedEnquiry.phone}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inquiry Message</p>
                  <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 relative quote-style">
                    <MessageSquare className="w-8 h-8 text-indigo-100 absolute top-6 right-8 rotate-12" />
                    <p className="text-gray-700 font-medium leading-relaxed italic relative z-10">"{selectedEnquiry.message}"</p>
                  </div>
                </div>

                {selectedEnquiry.photos && selectedEnquiry.photos.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enquiry Photos / Bill Attachments</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedEnquiry.photos.map((photoUrl, idx) => (
                        <div key={idx} className="bg-gray-50 p-2 rounded-[32px] border border-gray-100 overflow-hidden group/img">
                          <img 
                            src={photoUrl || undefined} 
                            alt={`Bulk Enquiry Photo ${idx + 1}`} 
                            className="w-full aspect-[4/3] object-cover rounded-2xl hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="mt-2 flex justify-center">
                            <a 
                              href={photoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[8px] font-black text-indigo-600 hover:underline uppercase tracking-widest flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Full Size
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEnquiry.billUrl && !selectedEnquiry.photos && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paper Bill Attachment</p>
                    <div className="bg-gray-50 p-4 rounded-[40px] border border-gray-100 overflow-hidden">
                      <img 
                        src={selectedEnquiry.billUrl || undefined} 
                        alt="Bulk Enquiry Bill" 
                        className="w-full h-auto rounded-3xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="mt-4 flex justify-center">
                        <a 
                          href={selectedEnquiry.billUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[10px] font-black text-white bg-indigo-600 px-6 py-3 rounded-xl hover:bg-black transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-widest"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Full Size
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-10 border-t border-gray-100 space-y-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Update Inquiry Progress</p>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { status: 'Pending', icon: Clock, color: 'orange' },
                      { status: 'Contacted', icon: MessageSquare, color: 'blue' },
                      { status: 'Accepted', icon: CheckCircle, color: 'indigo' },
                      { status: 'Closed', icon: XCircle, color: 'green' }
                    ].map((s) => (
                      <button
                        key={s.status}
                        onClick={() => handleUpdateStatus(selectedEnquiry.id, s.status as any)}
                        className={`flex flex-col items-center gap-3 p-6 rounded-[32px] transition-all border-2 active:scale-95 ${
                          selectedEnquiry.status === s.status 
                            ? `bg-${s.color === 'indigo' ? 'indigo-600' : `${s.color}-500`} text-white border-${s.color}-600 shadow-xl shadow-${s.color}-500/20 scale-105` 
                            : `bg-white text-gray-400 border-gray-50 hover:border-${s.color}-200 hover:text-${s.color}-500`
                        }`}
                      >
                        <s.icon className="w-8 h-8" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{s.status}</span>
                      </button>
                    ))}
                  </div>

                  {selectedEnquiry.status === 'Accepted' && (
                    <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col gap-4">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Order Actions</p>
                       <button
                         onClick={() => {
                           // Dispatch custom event to be picked up by Admin.tsx
                           window.dispatchEvent(new CustomEvent('createOrderFromEnquiry', { detail: selectedEnquiry }));
                           setSelectedEnquiry(null);
                         }}
                         className="w-full bg-black text-white hover:bg-primary py-6 rounded-[32px] font-black flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
                       >
                         <ShoppingBag className="w-6 h-6" />
                         CREATE ORDER FROM BILL
                       </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
