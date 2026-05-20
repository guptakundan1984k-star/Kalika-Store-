export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  purchasePrice?: number;
  category: string;
  image: string; // Keep for backward compatibility, but we'll use primaryImage
  images?: string[]; // Array of image URLs
  hasManualPhoto?: boolean;
  primaryImage?: string; 
  stock: number;
  createdAt: number;
  rating?: number;
  reviewCount?: number;
  weight?: string; // e.g., "500g", "1kg"
  tag?: 'Bestseller' | 'Top Rated' | 'New Arrival' | 'Trending';
  barcode?: string;
  searchKeywords?: string[]; // Hidden keywords for smart search
  synonyms?: string[]; // Related words
  tags?: string[]; // Publicly visible tags or labels
  variations?: {
    sizes?: string[];
    colors?: string[];
    flavors?: string[];
  };
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  photos?: string[];
  createdAt: number;
  orderId?: string; // Link to the specific order that allowed this review
  isCSReview?: boolean;
}

export interface Address {
  id: string;
  label: string; // e.g., "Home", "Work"
  address: string;
  lat: number;
  lng: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export type ProductUnit = 'Piece' | 'Kg' | 'Gm' | 'Litre' | 'Ml' | 'Pack' | 'Box';

export interface CartItem extends Product {
  quantity: number;
  selectedUnit?: string;
  selectedVariations?: {
    size?: string;
    color?: string;
    flavor?: string;
  };
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'Pending' | 'Order Received' | 'Order Placed' | 'Packaging' | 'Packed' | 'Out for Delivery' | 'Ready to Pick Up' | 'Picked Up' | 'Delivered' | 'Cancelled';
  deliveryType: 'Takeaway' | 'Delivery';
  userName?: string;
  userPhone?: string;
  address?: {
    manual?: string;
    lat?: number;
    lng?: number;
    liveLocationUrl?: string;
    verified?: boolean;
  };
  pin: string;
  deliverySlot?: string;
  paymentMethod?: 'PhonePe' | 'Paytm' | 'Google Pay' | 'COD' | 'UPI' | 'Cards' | 'WALLET';
  inBag?: boolean;
  createdAt: number;
  prescriptionImage?: string;
  receivedAmount?: number;
  walletAdjusted?: boolean;
  walletRedeemed?: number;
  walletDebtSettle?: number;
  walletUsed?: number;
  estimatedDelivery?: number;
  isPreOrder?: boolean;
  orderType?: 'personal' | 'sell';
  cancellationReason?: string;
  deliveredBy?: string; // staff UID
  placedBy?: 'User' | 'Store';
  adminName?: string;
  adminPhone?: string;
  tracking?: {
    status: string;
    timestamp: number;
    message: string;
  }[];
}

export interface FeatureRequest {
  id: string;
  userId: string;
  userName: string;
  feature: string;
  status: 'pending' | 'reviewed' | 'implemented';
  createdAt: number;
}

export interface Expense {
  id: string;
  itemName: string;
  amount: number;
  quantity?: string;
  date: number;
  notes?: string;
  photoUrl?: string;
  category?: string;
  source: 'voice' | 'photo' | 'manual';
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'cs';
  password?: string;
  address?: string;
  addresses?: Address[];
  wishlist?: string[]; // Array of product IDs
  lastActiveAt?: number;
  walletBalance?: number; // can be negative for dues
  upiId?: string;
  upiName?: string;
  adViewsCount?: number;
  totalAdEarnings?: number;
  customPrices?: Record<string, number>; // productId -> custom price
  introSeen?: boolean;
  fcmTokens?: string[]; // Multiple devices
  notificationPreferences?: {
    orderUpdates: boolean;
    promotions: boolean;
    deliveryAlerts: boolean;
  };
  pendingBonus?: {
    id: string;
    amount: number;
    description: string;
    expiresAt: number;
    createdAt: number;
  };
}

export interface AdEarning {
  id: string;
  userId: string;
  userName: string;
  count: number;
  lastWatchedAt: number;
  paymentStatus: 'pending' | 'paid';
  upiId?: string;
  upiName?: string;
  paidAt?: number;
  transactionId?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  type: 'order_payment' | 'add_money' | 'delivery_adjustment' | 'manual_correction' | 'wallet_topup' | 'manual_debit';
  description: string;
  orderId?: string;
  createdAt: number;
  expiresAt?: number;
  disbursalDate?: number;
}

export interface WalletRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  method?: 'online' | 'offline';
  screenshot?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface Due {
  id: string;
  name: string;
  phone: string;
  address: string;
  amount: number;
  createdAt: number;
  updatedAt: number;
}

export interface BulkEnquiry {
  id: string;
  userId: string;
  storeName: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  billUrl?: string;
  photos?: string[];
  status: 'Pending' | 'Contacted' | 'Closed' | 'Accepted';
  isRead?: boolean;
  createdAt: number;
}

export interface SupportQuery {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  chatHistory: {
    role: 'user' | 'ai' | 'admin';
    content: string;
    image?: string;
    timestamp?: number;
  }[];
  status: 'pending' | 'resolved' | 'closed';
  isRead?: boolean;
  updatedAt: number;
  createdAt: number;
}

export interface Banner {
  id: string;
  image: string; // Also holds video URL
  title: string;
  subtitle?: string;
  link?: string;
  active: boolean;
  type?: 'image' | 'video';
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  minOrder?: number;
  maxDiscount?: number;
  expiryDate?: number;
  usageLimit?: number; // Total limit
  usageLimitPerCustomer?: number;
  usedCount?: number;
  eligibleProducts?: string[]; // Array of Product IDs
  status: 'active' | 'inactive';
}

export interface EnvStatus {
  status: 'open' | 'delayed' | 'closed';
  reason: string;
  weather?: string;
  holiday?: string;
}

export interface StoreSettings {
  isOpen: boolean; // Manual override
  autoSchedule: boolean; // Follow operating hours automatically
  isFunctionallyOpen?: boolean; // Combined logic state
  openingTime: string; // Mon-Sat
  closingTime: string; // Mon-Sat
  sundayOpeningTime: string;
  sundayClosingTime: string;
  message?: string;
  storeName?: string;
  contactPhone?: string;
  contactEmail?: string;
  storeAddress?: string;
  logoUrl?: string;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  isVoiceSupportEnabled?: boolean;
  isAiAssistantEnabled?: boolean;
  isDeliveryEnabled?: boolean;
  adminWhatsAppNumbers?: string[];
  adminNotificationNumbers?: string[]; // Phone numbers for orders
  updatedAt: number;
}
