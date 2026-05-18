import { Product } from '../types';

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: "Sudha Milk 500ml",
    description: "Fresh milk from Sudha dairy.",
    price: 31,
    purchasePrice: 0,
    category: "Dairy",
    image: "https://www.sudha.coop/images/Sudha-Special-Milk.png",
    images: ["https://www.sudha.coop/images/Sudha-Special-Milk.png"],
    stock: 4997,
    weight: "500ml",
    createdAt: Date.now()
  }
];
