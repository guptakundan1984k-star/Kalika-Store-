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
  primaryImage?: string; 
  stock: number;
  createdAt: number;
  rating?: number;
  reviewCount?: number;
  weight?: string; // e.g., "500g", "1kg"
  tag?: 'Bestseller' | 'Top Rated' | 'New Arrival' | 'Trending';
  barcode?: string;
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
  createdAt: number;
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
  status: 'Pending' | 'Order Received' | 'Packaging' | 'Packed' | 'Out for Delivery' | 'Ready to Pick Up' | 'Delivered' | 'Cancelled';
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
  paymentMethod?: 'PhonePe' | 'Paytm' | 'Google Pay' | 'COD' | 'UPI' | 'Cards';
  inBag?: boolean;
  createdAt: number;
  prescriptionImage?: string;
  earnedPoints?: number;
  redeemedPoints?: number;
  receivedAmount?: number;
  estimatedDelivery?: number;
  isPreOrder?: boolean;
  cancellationReason?: string;
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
  role: 'user' | 'admin';
  password?: string;
  address?: string;
  addresses?: Address[];
  wishlist?: string[]; // Array of product IDs
  lastActiveAt?: number;
  loyaltyPoints?: number;
  walletBalance?: number; // can be negative for dues
  customPrices?: Record<string, number>; // productId -> custom price
  introSeen?: boolean;
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
  status: 'Pending' | 'Contacted' | 'Closed' | 'Accepted';
  createdAt: number;
}

export interface Banner {
  id: string;
  image: string; // Also holds video URL
  title: string;
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
  usageLimitPerCustomer?: number;
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
  updatedAt: number;
}
