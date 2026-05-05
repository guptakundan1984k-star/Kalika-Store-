import React, { useState } from 'react';
import { UserProfile, Order, Address, BulkEnquiry, FeatureRequest } from '../types';
import { SUPPORT_EMAIL } from '../constants';
import { 
  User, Mail, Phone, MapPin, Package, LogOut, 
  ChevronRight, ShoppingBag, Heart, Plus, Minus, Trash2, 
  Home, Briefcase, Map as MapIcon, Clock, CheckCircle, Truck, Package as PackageIcon, ArrowRight, LayoutDashboard, Play,
  HelpCircle, MessageSquare, Shield, Lock, Sparkles, FileText, Eye, EyeOff,
  Image as ImageIcon, X, Languages, Volume2, VolumeX, Smartphone, Loader2, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ProductImage } from '../components/ProductImage';
import { auth, signOut, db, doc, updateDoc, collection, addDoc, setDoc, onSnapshot, query, where, handleFirestoreError, OperationType } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { answerAdminQuery } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext';

import { WalletManager } from '../components/WalletManager';

interface ProfileProps {
  user: UserProfile;
  orders: Order[];
}

const Profile: React.FC<ProfileProps> = ({ user, orders }) => {
  const navigate = useNavigate();
  const { language, setLanguage, t, isVoiceEnabled, setIsVoiceEnabled } = useLanguage();
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'help' | 'wishlist' | 'bulk'>('orders');
  const [bulkEnquiries, setBulkEnquiries] = useState<BulkEnquiry[]>([]);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    storeName: '',
    message: '',
    phone: user.phone || ''
  });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isEditingPrimary, setIsEditingPrimary] = useState(false);
  const [primaryAddress, setPrimaryAddress] = useState(user.address || '');
  const [adminPassword, setAdminPassword] = useState('');
  const [isRequestingFeature, setIsRequestingFeature] = useState(false);
  const [featureDescription, setFeatureDescription] = useState('');
  const [isSubmittingFeature, setIsSubmittingFeature] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const edit = params.get('edit');
    if (tab === 'orders') setActiveTab('orders');
    if (tab === 'help') setActiveTab('help');
    if (tab === 'bulk') setActiveTab('bulk');
    if (tab === 'addresses') setActiveTab('addresses');
    if (tab === 'wishlist') setActiveTab('wishlist');
    if (edit === 'true') setIsEditingProfile(true);
  }, []);

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({ label: 'Home', address: '' });

  const handleUpdatePrimaryAddress = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { address: primaryAddress });
      setIsEditingPrimary(false);
    } catch (error) {
      console.error("Error updating primary address:", error);
    }
  };

  const handlePrintInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice - ${order.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .logo { 
              font-size: 24px; 
              font-weight: 900; 
              background: #00AEEF1A; 
              color: #00AEEF; 
              padding: 10px 20px; 
              border-radius: 12px;
              border: 1px solid #00AEEF33;
            }
            .info { margin-top: 30px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 40px; }
            th { text-align: left; border-bottom: 1px solid #eee; padding: 10px; font-size: 12px; color: #999; text-transform: uppercase; }
            td { padding: 15px 10px; border-bottom: 1px solid #f9f9f9; }
            .total { margin-top: 30px; text-align: right; font-size: 20px; font-weight: 900; }
            .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Kalika Store</div>
            <div>
              <div style="font-weight: bold;">Invoice #${order.id.slice(-8).toUpperCase()}</div>
              <div style="color: #999;">${new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
          <div class="info">
            <div>
              <div style="color: #999; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Customer</div>
              <div style="font-weight: bold;">${user.name}</div>
              <div>${order.deliveryType}</div>
            </div>
            <div>
              <div style="color: #999; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Delivery Address</div>
              <div>${order.address?.manual || 'No address provided'}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Qty</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>₹${item.price}</td>
                  <td>${item.quantity}</td>
                  <td style="text-align: right;">₹${item.price * item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">Total: ₹${order.total}</div>
          <div class="footer">
            Thank you for shopping with Kalika Store!<br>
            Ranchi, Jharkhand
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    email: user.email || ''
  });

  const handleUpdateProfile = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...profileForm,
        updatedAt: Date.now()
      });
      setIsEditingProfile(false);
    } catch (e) {
      console.error("Profile update failed", e);
    }
  };
  // Listen for bulk enquiries
  React.useEffect(() => {
    const q = query(collection(db, 'bulk_enquiries'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBulkEnquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BulkEnquiry)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bulk_enquiries', false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBulk(true);
    try {
      const enquiry: Omit<BulkEnquiry, 'id'> = {
        userId: user.uid,
        name: user.name,
        email: user.email,
        phone: bulkFormData.phone,
        storeName: bulkFormData.storeName,
        message: bulkFormData.message,
        status: 'Pending',
        createdAt: Date.now()
      };
      await addDoc(collection(db, 'bulk_enquiries'), enquiry);
      setBulkFormData({ storeName: '', message: '', phone: user.phone || '' });
      alert("Bulk Enquiry submitted successfully. We will contact you soon.");
    } catch (error) {
      console.error("Error submitting bulk enquiry:", error);
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const [helpQuery, setHelpQuery] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [helpMessages, setHelpMessages] = useState<{ role: 'user' | 'ai' | 'admin', content: string, image?: string }[]>([
    { role: 'ai', content: "Hello! I'm your Kalika Store assistant. How can I help you today?" }
  ]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sync chat to Firestore for admin visibility
  React.useEffect(() => {
    if (helpMessages.length > 1) {
      const syncChat = async () => {
        try {
          const lastMsg = helpMessages[helpMessages.length - 1];
          const isUserMessage = lastMsg && lastMsg.role === 'user';
          
          await setDoc(doc(db, 'support_queries', user.uid), {
            userId: user.uid,
            userName: user.name || 'Anonymous',
            userEmail: user.email || '',
            userPhone: user.phone || '',
            chatHistory: helpMessages,
            status: 'pending',
            updatedAt: Date.now(),
            ...(isUserMessage ? { isRead: false } : {}),
            createdAt: Date.now() // This will be overwritten by server if exists, but we use setDoc with merge
          }, { merge: true });
        } catch (error) {
          console.error("Error syncing chat:", error);
        }
      };
      syncChat();
    }
  }, [helpMessages, user]);

  // Listen for admin replies
  React.useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'support_queries', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.chatHistory && data.chatHistory.length > helpMessages.length) {
          // Check if the last message is from admin
          const lastMsg = data.chatHistory[data.chatHistory.length - 1];
          if (lastMsg.role === 'admin') {
            setHelpMessages(data.chatHistory);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `support_queries/${user.uid}`, false);
    });
    return () => unsubscribe();
  }, [user.uid, helpMessages.length]);

  const handleHelpSend = async () => {
    if (!helpQuery.trim() && !selectedImage) return;
    const userMsg = helpQuery;
    const userImg = selectedImage;
    setHelpQuery('');
    setSelectedImage(null);
    setHelpMessages(prev => [...prev, { role: 'user', content: userMsg, image: userImg || undefined }]);
    setHelpLoading(true);
    try {
      const response = await answerAdminQuery(userMsg || "Analyze this image", { user, orders }, userImg || undefined);
      setHelpMessages(prev => [...prev, { role: 'ai', content: response || "I'm sorry, I couldn't process that." }]);
    } catch (error) {
      setHelpMessages(prev => [...prev, { role: 'ai', content: "Error connecting to AI service." }]);
    } finally {
      setHelpLoading(false);
    }
  };

  const handleSubmitFeatureRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureDescription.trim()) return;

    setIsSubmittingFeature(true);
    try {
      const request: Omit<FeatureRequest, 'id'> = {
        userId: user.uid,
        userName: user.name,
        feature: featureDescription,
        status: 'pending',
        createdAt: Date.now()
      };
      await addDoc(collection(db, 'feature_requests'), request);
      setFeatureDescription('');
      setIsRequestingFeature(false);
      alert("Feature request submitted! Our team will review it.");
    } catch (error) {
      console.error("Error submitting feature request:", error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsSubmittingFeature(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAddressId) {
      const updatedAddresses = (user.addresses || []).map(a => 
        a.id === editingAddressId ? { ...a, label: newAddress.label, address: newAddress.address } : a
      );
      try {
        await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
        setEditingAddressId(null);
        setNewAddress({ label: 'Home', address: '' });
      } catch (error) {
        console.error("Error updating address:", error);
      }
    } else {
      const address: Address = {
        id: Math.random().toString(36).substr(2, 9),
        label: newAddress.label,
        address: newAddress.address,
        lat: 23.3884631, // Updated Ranchi lat
        lng: 85.2795441  // Updated Ranchi lng
      };
      
      const updatedAddresses = [...(user.addresses || []), address];
      try {
        await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
        setIsAddingAddress(false);
        setNewAddress({ label: 'Home', address: '' });
      } catch (error) {
        console.error("Error adding address:", error);
      }
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const updatedAddresses = (user.addresses || []).filter(a => a.id !== id);
    try {
      await updateDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses });
    } catch (error) {
      console.error("Error deleting address:", error);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'bg-orange-100 text-orange-600';
      case 'Packed': return 'bg-blue-100 text-blue-600';
      case 'Out for Delivery': return 'bg-purple-100 text-purple-600';
      case 'Delivered': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return Clock;
      case 'Packed': return PackageIcon;
      case 'Out for Delivery': return Truck;
      case 'Delivered': return CheckCircle;
      default: return Clock;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Complete Profile Prompt */}
          {!user.phone && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-4 bg-primary/5 border border-primary/20 p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 tracking-tight">Complete Your Profile</h4>
                  <p className="text-sm text-gray-500 font-medium">Add your phone number to receive order updates and verification calls.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-xs"
              >
                Add Phone Number
              </button>
            </motion.div>
          )}

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary mx-auto mb-6 shadow-inner">
                <User className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">{user.name}</h2>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-6">Valued Customer</p>
              
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personal Info</p>
                  <button 
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    {isEditingProfile ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</label>
                      <input 
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</label>
                      <input 
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</label>
                      <input 
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <button 
                      onClick={handleUpdateProfile}
                      className="w-full bg-primary text-white text-[10px] font-black py-3 rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                      Save Changes
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-gray-500 font-medium">
                      <Mail className="w-5 h-5 text-primary" />
                      <span className="text-sm truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500 font-medium">
                      <Phone className="w-5 h-5 text-primary" />
                      <span className="text-sm">{user.phone || 'Not set'}</span>
                    </div>
                  </>
                )}
              </div>



              <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Languages className="w-5 h-5 text-primary" />
                    <span className="text-sm font-black text-gray-900 uppercase tracking-widest">{t('language')}</span>
                  </div>
                  <button 
                    onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                    className="bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20 shadow-sm hover:bg-primary hover:text-white transition-all"
                  >
                    {language === 'en' ? 'English' : 'हिंदी'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    {isVoiceEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
                    <span className="text-sm font-black text-gray-900 uppercase tracking-widest">{t('voiceSupport')}</span>
                  </div>
                  <button 
                    onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                    className={`w-12 h-6 rounded-full transition-all relative ${isVoiceEnabled ? 'bg-primary' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isVoiceEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="mt-8 space-y-8">
                <WalletManager user={user} />

                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 mb-4 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Primary Address</p>
                    <button 
                      onClick={() => setIsEditingPrimary(!isEditingPrimary)}
                      className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                    >
                      {isEditingPrimary ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  {isEditingPrimary ? (
                    <div className="space-y-3">
                      <textarea
                        value={primaryAddress}
                        onChange={(e) => setPrimaryAddress(e.target.value)}
                        className="w-full bg-white border-none rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px]"
                        placeholder="Enter your primary address..."
                      />
                      <button 
                        onClick={handleUpdatePrimaryAddress}
                        className="w-full bg-primary text-white text-[10px] font-black py-2 rounded-xl uppercase tracking-widest"
                      >
                        Save Address
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-gray-700">{user.address || 'No primary address set.'}</p>
                  )}
                </div>
              </div>

              <button 
                onClick={handleSignOut}
                className="w-full mt-8 flex items-center justify-center gap-3 bg-red-50 text-red-500 font-black py-4 rounded-2xl hover:bg-red-100 transition-all active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>

            <div className="bg-white p-4 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-2">
              <button 
                onClick={() => navigate('/orders')}
                className="w-full flex items-center justify-between p-4 rounded-2xl font-black text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5" />
                  My Orders
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/addresses')}
                className="w-full flex items-center justify-between p-4 rounded-2xl font-black text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5" />
                  Addresses
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/help')}
                className="w-full flex items-center justify-between p-4 rounded-2xl font-black text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5" />
                  Help & Support
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setActiveTab('wishlist')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl font-black transition-all active:scale-95 ${activeTab === 'wishlist' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Heart className={`w-5 h-5 ${activeTab === 'wishlist' ? 'fill-current' : ''}`} />
                  Wishlist
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/bulk-enquiry')}
                className="w-full flex items-center justify-between p-4 rounded-2xl font-black text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5" />
                  Bulk Enquiry
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/photo-bill')}
                className="w-full flex items-center justify-between p-4 rounded-2xl font-black text-primary bg-primary/5 hover:bg-primary/10 transition-all border border-primary/10 active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5" />
                  Photo Bill System
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-between p-4 rounded-2xl font-black text-primary bg-primary/5 hover:bg-primary/10 transition-all border border-primary/10 mt-4 active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5" />
                  Admin Panel
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Content Header */}
            <div className="flex items-center justify-between">
      <h3 className="text-3xl font-black text-gray-900 tracking-tight">
        {activeTab === 'orders' ? 'Order History' : 
         activeTab === 'addresses' ? 'My Addresses' : 
         activeTab === 'help' ? 'Help & Support' : 
         activeTab === 'wishlist' ? 'My Wishlist' : 'Bulk Enquiry'}
      </h3>
              <button 
                onClick={() => setIsRequestingFeature(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all active:scale-95 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Request Feature
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => navigate('/help')}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group text-center flex flex-col items-center gap-3 active:scale-95"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-900">AI Support</span>
              </button>

              <button 
                onClick={() => setActiveTab('wishlist')}
                className={`p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group text-center flex flex-col items-center gap-3 active:scale-95 ${activeTab === 'wishlist' ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-white'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${activeTab === 'wishlist' ? 'bg-primary text-white' : 'bg-red-50 text-red-500'}`}>
                  <Heart className={`w-6 h-6 ${activeTab === 'wishlist' ? 'fill-current' : ''}`} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-900">Wishlist</span>
              </button>

              {user.role === 'admin' ? (
                <Link 
                  to="/admin"
                  className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group text-center flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-gray-900">Admin Panel</span>
                </Link>
              ) : (
                <button 
                  onClick={() => setIsAdminModalOpen(true)}
                  className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group text-center flex flex-col items-center gap-3 relative overflow-hidden"
                >
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter leading-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 animate-gradient-x bg-[length:200%_auto]">
                      Admin Login
                    </span>
                  </span>
                </button>
              )}

              <button 
                onClick={() => setActiveTab('orders')}
                className={`p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group text-center flex flex-col items-center gap-3 active:scale-95 ${activeTab === 'orders' ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-white'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${activeTab === 'orders' ? 'bg-primary text-white' : 'bg-blue-50 text-blue-600'}`}>
                  <Package className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-900">Orders</span>
              </button>


              <button 
                onClick={() => navigate('/bulk-enquiry')}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group text-center flex flex-col items-center gap-3 active:scale-95"
              >
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-900">Bulk Enquiry</span>
              </button>

              <button 
                onClick={() => navigate('/photo-bill')}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group text-center flex flex-col items-center gap-3 active:scale-95"
              >
                <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-900">Photo Bill</span>
              </button>

              <button 
                onClick={() => navigate('/addresses')}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group text-center flex flex-col items-center gap-3 active:scale-95"
              >
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-900">Addresses</span>
              </button>
            </div>



            <AnimatePresence mode="wait">
              {activeTab === 'orders' ? (
                <motion.div 
                  key="orders"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {orders.length > 0 ? (
                    orders.map((order) => {
                      const StatusIcon = getStatusIcon(order.status);
                      return (
                        <div key={order.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-50">
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50 ${getStatusColor(order.status)}`}>
                                <StatusIcon className="w-7 h-7" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                                <h4 className="text-lg font-black text-gray-900">#{order.id.slice(-8).toUpperCase()}</h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => handlePrintInvoice(order)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                              >
                                <FileText className="w-4 h-4" />
                                Invoice
                              </button>
                              <div className="text-right">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Date</p>
                              <p className="font-bold text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                              <p className="font-black text-primary">₹{order.total}</p>
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Type</p>
                              <p className="font-bold text-gray-900">{order.deliveryType}</p>
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">PIN</p>
                              <p className="font-black text-gray-900 tracking-widest">{order.pin}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {order.items.map((item, i) => (
                              <div key={`order-item-${order.id}-${i}`} className="bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 border border-gray-100 flex items-center gap-2">
                                {item.image && (
                                  <ProductImage 
                                    src={item.image || undefined} 
                                    alt={item.name} 
                                    className="w-6 h-6 rounded-lg object-cover" 
                                  />
                                )}
                                {item.name} x{item.quantity}
                              </div>
                            ))}
                          </div>

                          {/* Order Tracking Visualization */}
                          <div className="pt-6 border-t border-gray-50">
                            <div className="flex items-center justify-between mb-6">
                              <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Order Tracking</h5>
                              <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg uppercase tracking-widest">Live Updates</span>
                            </div>
                            <div className="relative flex items-center justify-between">
                              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100 -z-10" />
                              <div 
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary transition-all duration-1000 -z-10" 
                                style={{ 
                                  width: order.status === 'Pending' ? '0%' : 
                                         order.status === 'Order Received' ? '25%' :
                                         order.status === 'Packed' ? '50%' : 
                                         order.status === 'Out for Delivery' ? '75%' : '100%' 
                                }} 
                              />
                              
                              {[
                                { status: 'Pending', label: 'Order Placed', icon: Clock },
                                { status: 'Order Received', label: 'Order Received', icon: CheckCircle, small: true },
                                { status: 'Packed', label: 'Packed', icon: PackageIcon },
                                { status: 'Out for Delivery', label: 'Out for Delivery', icon: Truck },
                                { status: 'Delivered', label: 'Delivered', icon: CheckCircle }
                              ].map((step, i) => {
                                const StepIcon = step.icon;
                                const stepsArr = ['Pending', 'Order Received', 'Packed', 'Out for Delivery', 'Delivered'];
                                const statusIdx = stepsArr.indexOf(order.status);
                                const isCompleted = statusIdx >= i;
                                const isCurrent = order.status === step.status;

                                return (
                                  <div key={`step-${order.id}-${i}`} className="flex flex-col items-center gap-2">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                                      isCompleted ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-gray-300 border border-gray-100'
                                    } ${isCurrent ? 'scale-125 ring-4 ring-primary/10' : ''}`}>
                                      <StepIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <span className={`text-[8px] font-black uppercase tracking-tight text-center max-w-[60px] leading-tight ${
                                        isCompleted ? 'text-gray-900' : 'text-gray-300'
                                      } ${step.small ? 'scale-90 opacity-60' : ''}`}>
                                        {step.label}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-gray-200">
                      <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                      <h4 className="text-xl font-black text-gray-400">No orders found</h4>
                      <p className="text-sm font-medium text-gray-400 max-w-xs mx-auto">
                        You don't have any active orders. Note: Orders older than 3 months are automatically archived.
                      </p>
                      <Link to="/products" className="inline-block mt-6 bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95">
                        Start Shopping
                      </Link>
                    </div>
                  )}

                </motion.div>
              ) : activeTab === 'bulk' ? (
                <motion.div 
                  key="bulk"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="bg-gradient-to-br from-indigo-600 to-primary p-12 rounded-[50px] text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 space-y-6">
                      <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-xl">
                        <Briefcase className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-4xl font-black tracking-tight">Bulk Enquiry</h3>
                        <p className="text-indigo-100 font-medium max-w-md">Are you a store owner or bulk purchaser? Submit your inquiry below for special pricing and terms.</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleBulkSubmit} className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Store/Business Name</label>
                        <input 
                          required
                          type="text"
                          value={bulkFormData.storeName}
                          onChange={(e) => setBulkFormData({ ...bulkFormData, storeName: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                          placeholder="Name of your enterprise"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Phone</label>
                        <input 
                          required
                          type="tel"
                          value={bulkFormData.phone}
                          onChange={(e) => setBulkFormData({ ...bulkFormData, phone: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                          placeholder="Your direct mobile number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">How can we help? (Products, Quantities, Target Price)</label>
                      <textarea 
                        required
                        value={bulkFormData.message}
                        onChange={(e) => setBulkFormData({ ...bulkFormData, message: e.target.value })}
                        rows={5}
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                        placeholder="Tell us about your requirements..."
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isSubmittingBulk}
                      className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:bg-black transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSubmittingBulk ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Submit Bulk Enquiry
                    </button>
                  </form>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-black text-gray-900 tracking-tight">Previous Inquiries</h4>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{bulkEnquiries.length} Total</span>
                    </div>
                    {bulkEnquiries.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {bulkEnquiries.map((enquiry) => (
                          <div key={enquiry.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h5 className="font-black text-gray-900">{enquiry.storeName}</h5>
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                  enquiry.status === 'Pending' ? 'bg-orange-100 text-orange-600' :
                                  enquiry.status === 'Contacted' ? 'bg-blue-100 text-blue-600' :
                                  'bg-green-100 text-green-600'
                                }`}>
                                  {enquiry.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 font-medium line-clamp-2">{enquiry.message}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(enquiry.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-primary transition-colors">
                                <Eye className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-[40px] border border-dashed border-gray-200">
                        <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm font-bold text-gray-400">No previous inquiries found.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : activeTab === 'addresses' ? (
                <motion.div 
                  key="addresses"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">My Addresses</h3>
                    <button 
                      onClick={() => setIsAddingAddress(true)}
                      className="bg-primary text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Add New
                    </button>
                  </div>

                  {(isAddingAddress || editingAddressId) && (
                    <motion.form 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onSubmit={handleAddAddress}
                      className="bg-white p-8 rounded-[40px] border-2 border-primary/20 shadow-2xl shadow-primary/5 space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Label</label>
                          <div className="flex gap-2">
                            {['Home', 'Work', 'Other'].map((l) => (
                              <button
                                key={l}
                                type="button"
                                onClick={() => setNewAddress({ ...newAddress, label: l })}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                  newAddress.label === l ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                }`}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Address</label>
                          <input 
                            required
                            value={newAddress.address}
                            onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                            placeholder="Street, Landmark, City..."
                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all"
                          />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          type="submit"
                          className="flex-1 bg-gray-900 text-white font-black py-4 rounded-2xl"
                        >
                          {editingAddressId ? 'Update Address' : 'Save Address'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setIsAddingAddress(false);
                            setEditingAddressId(null);
                            setNewAddress({ label: 'Home', address: '' });
                          }}
                          className="flex-1 bg-gray-50 text-gray-400 font-black py-4 rounded-2xl"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {user.addresses && user.addresses.length > 0 ? (
                      user.addresses.map((addr) => (
                        <div key={addr.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 group relative">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                              {addr.label === 'Home' ? <Home className="w-6 h-6" /> : 
                               addr.label === 'Work' ? <Briefcase className="w-6 h-6" /> : 
                               <MapIcon className="w-6 h-6" />}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-black text-gray-900 mb-1">{addr.label}</h4>
                              <p className="text-sm text-gray-500 font-medium leading-relaxed">{addr.address}</p>
                            </div>
                          </div>
                          <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => {
                                setEditingAddressId(addr.id);
                                setNewAddress({ label: addr.label, address: addr.address });
                              }}
                              className="p-2 text-gray-300 hover:text-primary transition-colors"
                            >
                              <Plus className="w-5 h-5 rotate-45" />
                            </button>
                            <button 
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="md:col-span-2 text-center py-24 bg-white rounded-[40px] border border-dashed border-gray-200">
                        <MapPin className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h4 className="text-xl font-black text-gray-400">No addresses saved</h4>
                        <p className="text-sm font-medium text-gray-400">Add your delivery addresses for faster checkout!</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : activeTab === 'wishlist' ? (
                <motion.div 
                  key="wishlist"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">My Wishlist</h3>
                    <Link to="/products" className="text-sm font-black text-primary hover:underline">Add More</Link>
                  </div>
                  <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto shadow-inner">
                      <Heart className="w-10 h-10 fill-current" />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-2xl font-black text-gray-900">{user.wishlist?.length || 0} Items Saved</h4>
                      <p className="text-gray-500 font-medium max-w-sm mx-auto">Your personal collection of favorites is ready for you to explore and shop.</p>
                    </div>
                    <Link to="/wishlist" className="inline-flex items-center gap-3 bg-gray-900 text-white font-black px-10 py-5 rounded-[24px] shadow-2xl shadow-gray-200 hover:bg-black transition-all active:scale-95 group">
                      View Wishlist Manager
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="help"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 text-center space-y-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto">
                      <MessageSquare className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black text-gray-900 tracking-tight">AI Help Assistant</h3>
                      <p className="text-sm font-medium text-gray-400 max-w-md mx-auto">Ask anything about your orders, products, or store policies. Our AI is here to help you 24/7.</p>
                    </div>
                    
                    <div className="bg-gray-50 p-6 rounded-3xl text-left space-y-4 max-h-[300px] overflow-y-auto">
                      {helpMessages.map((msg, i) => (
                        <div key={`help-${i}`} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            msg.role === 'ai' ? 'bg-primary text-white' : 
                            msg.role === 'admin' ? 'bg-secondary text-white' : 'bg-gray-900 text-white'
                          }`}>
                            {msg.role === 'ai' ? <Sparkles className="w-4 h-4" /> : 
                             msg.role === 'admin' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div className={`p-4 rounded-2xl shadow-sm border border-gray-100 ${
                            msg.role === 'ai' ? 'bg-white rounded-tl-none' : 
                            msg.role === 'admin' ? 'bg-secondary/10 text-secondary border-secondary/20 rounded-tl-none' :
                            'bg-primary text-white rounded-tr-none border-none'
                          }`}>
                            {msg.image && (
                              <img 
                                src={msg.image || undefined} 
                                alt="Shared" 
                                className="w-full max-w-[200px] rounded-xl mb-2 object-cover"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="text-sm font-medium prose prose-sm max-w-none prose-invert">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ))}
                      {helpLoading && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      )}
                    </div>

                      <div className="space-y-4">
                        {selectedImage && (
                          <div className="relative inline-block">
                            <img src={selectedImage || undefined} alt="Preview" className="w-20 h-20 object-cover rounded-xl border-2 border-primary" />
                            <button 
                              onClick={() => setSelectedImage(null)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="relative">
                          <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            className="hidden"
                          />
                          <input 
                            type="text" 
                            value={helpQuery}
                            onChange={(e) => setHelpQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleHelpSend()}
                            placeholder="Type your question here..."
                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 pr-28 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="p-3 text-gray-400 hover:text-primary transition-colors"
                            >
                              <ImageIcon className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={handleHelpSend}
                              disabled={helpLoading}
                              className="bg-primary text-white p-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50"
                            >
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
                      <div className="w-14 h-14 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center">
                        <Phone className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900">Call Us</h4>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">+91 9608123427</p>
                      </div>
                    </div>
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
                      <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900">Email Us</h4>
                        <a 
                          href={`mailto:${SUPPORT_EMAIL}`}
                          className="text-xs font-bold text-primary uppercase tracking-widest hover:underline"
                        >
                          {SUPPORT_EMAIL}
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Profile Footer */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="text-sm font-black text-primary hover:underline flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Admin Panel
            </Link>
            <button className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-all">Privacy Policy</button>
            <button className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-all">Terms of Service</button>
          </div>
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">&copy; 2026 Kalika Store Ranchi</p>
        </div>
        {/* Feature Request Modal */}
        <AnimatePresence>
          {isRequestingFeature && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsRequestingFeature(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl relative z-10 space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Request a Feature</h3>
                  <p className="text-sm text-gray-500 font-medium">Tell us what you'd like to see in our app!</p>
                </div>

                <form onSubmit={handleSubmitFeatureRequest} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Your Name</label>
                    <input 
                      type="text"
                      disabled
                      value={user.name}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Feature Description</label>
                    <textarea 
                      required
                      value={featureDescription}
                      onChange={(e) => setFeatureDescription(e.target.value)}
                      placeholder="I would like to have a feature that..."
                      rows={4}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all resize-none outline-none"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsRequestingFeature(false)}
                      className="flex-1 bg-gray-50 text-gray-400 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmittingFeature}
                      className="flex-1 bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-black transition-all active:scale-95 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingFeature ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Admin Login Modal */}
        <AnimatePresence>
          {isAdminModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdminModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl relative z-10 space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Admin Entrance</h3>
                  <p className="text-sm text-gray-500 font-medium">Please enter the administrator passcode</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Passcode</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type={showAdminPassword ? 'text' : 'password'} 
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-12 py-4 text-sm font-black tracking-widest focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showAdminPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {adminError && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-2">{adminError}</p>}
                  </div>

                  <button 
                    onClick={() => {
                      if (adminPassword === 'admin123') { // Mock admin password
                        navigate('/admin');
                      } else {
                        setAdminError("It's not");
                        setTimeout(() => setAdminError(''), 3000);
                      }
                    }}
                    className="w-full bg-primary text-white font-black py-5 rounded-3xl shadow-xl shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95"
                  >
                    Enter Admin Panel
                  </button>
                  
                  <p className="text-[10px] font-black text-center uppercase tracking-tighter leading-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 animate-gradient-x bg-[length:200%_auto]">
                      It's not made for you, thank you
                    </span>
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Profile;
