export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  purchasePrice?: number;
  category: string;
  image: string;
  stock: number;
  createdAt: number;
  rating?: number;
  reviewCount?: number;
  weight?: string; // e.g., "500g", "1kg"
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

export interface CartItem extends Product {
  quantity: number;
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
  status: 'Pending' | 'Proceeded' | 'Packed' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  deliveryType: 'Takeaway' | 'Delivery';
  userName?: string;
  userPhone?: string;
  address?: {
    manual?: string;
    lat?: number;
    lng?: number;
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
  tracking?: {
    status: string;
    timestamp: number;
    message: string;
  }[];
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
}

export interface Banner {
  id: string;
  image: string;
  title: string;
  link?: string;
  active: boolean;
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
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  message?: string;
  updatedAt: number;
}
