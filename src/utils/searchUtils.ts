import { Product } from '../types';

/**
 * Semantic mapping for grocery terms.
 * This allows a search for "cold drinks" to match products in categories like "Beverages"
 * or products with tags like "soda", "soft drink", etc.
 */
export const SEMANTIC_MAPPING: Record<string, string[]> = {
  'cold drinks': ['beverage', 'soda', 'soft drink', 'juice bottle', 'pepsi', 'coke', 'sprite', 'mirinda', 'fanta', 'limca', 'sting', 'mountain dew', 'thums up'],
  'soft drink': ['beverage', 'soda', 'cold drink', 'pepsi', 'coke', 'thumbs up', 'fanta', 'sprite'],
  'beverage': ['cold drink', 'soft drink', 'juice', 'energy drink', 'water bottle', 'tea', 'coffee', 'bournvita', 'horlicks'],
  'juice': ['fruit juice', 'real juice', 'tropicana', 'beverage', 'maaza', 'frooti', 'slice', 'b-natural'],
  'snacks': ['chips', 'namkeen', 'kurkure', 'bhujia', 'munch', 'biscuits', 'cookies', 'popcorn', 'mixture', 'noodles', 'maggie'],
  'namkeen': ['snacks', 'bhujia', 'munch', 'haldiram', 'bikaji', 'mixture', 'sev', 'gathiya', 'moong dal'],
  'chips': ['lays', 'uncle chips', 'bingo', 'snacks', 'kurkure', 'doritos', 'pringles'],
  'biscuit': ['cookies', 'parle-g', 'mariegold', 'good day', 'oreo', 'snacks', 'dark fantasy', 'bourbon', 'hide and seek', 'monaco', 'krackjack'],
  'cookies': ['biscuit', 'snacks', 'cookies', 'baked'],
  'soap': ['bath soap', 'washing soap', 'detergent', 'lux', 'lifebuoy', 'dettol', 'dove', 'pears', 'santoor', 'vivel', 'cinthol'],
  'detergent': ['washing powder', 'surf excel', 'ariel', 'tide', 'wheel', 'ghadi', 'rim', 'sunlight'],
  'atta': ['flour', 'wheat flour', 'ashirvaad', 'shakti bhog', 'staples', 'chakki fresh', 'maida', 'besan', 'suji'],
  'rice': ['basmati', 'pulao rice', 'daawat', 'fortune', 'staples', 'india gate', 'mini mogra', 'kolam'],
  'chocolate': ['candy', 'sweets', 'dairy milk', 'kitkat', 'munch', 'perk', 'snickers', '5 star', 'silk', 'ferrero'],
  'candy': ['chocolate', 'sweets', 'toffee', 'pulse', 'mango bite'],
  'cooking oil': ['mustard oil', 'refined oil', 'fortune', 'dhara', 'staples', 'saffola', 'sundrop', 'emami', 'ghee'],
  'spices': ['masala', 'mdh', 'everest', 'catch', 'cooking essentials', 'turmeric', 'haldi', 'jeera', 'dhaniya'],
  'dairy': ['milk', 'curd', 'paneer', 'butter', 'cheese', 'amul', 'mother dairy', 'dahi', 'lassi', 'chaas'],
  'cleaning': ['harpic', 'lizol', 'colin', 'detergent', 'soap', 'phenyl', 'comfort', 'vimal'],
  'dental': ['toothpaste', 'toothbrush', 'colgate', 'pepsodent', 'sensodyne', 'dabur red', 'closeup', 'oral-b'],
  'breakfast': ['oats', 'cornflakes', 'muesli', 'bread', 'jam', 'peanut butter', 'honey', 'poha', 'vermicelli'],
  'pulses': ['dal', 'moong', 'masoor', 'toor', 'chana', 'rajma', 'kabuli chana'],
  'personal care': ['shampoo', 'conditioner', 'face wash', 'lotion', 'cream', 'oil', 'powder', 'perfume', 'deodorant'],
  'staples': ['atta', 'rice', 'dal', 'pulses', 'sugar', 'salt', 'oil', 'ghee'],
};

/**
 * Normalizes a string for comparison
 */
export const normalizeString = (str: string): string => {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
};

/**
 * Scores a product based on a search query
 */
export const scoreProduct = (product: Product, query: string): number => {
  const q = normalizeString(query);
  if (!q) return 0;

  const name = normalizeString(product.name);
  const desc = normalizeString(product.description);
  const category = normalizeString(product.category);
  const tags = (product.tags || []).map(normalizeString);
  const keywords = (product.searchKeywords || []).map(normalizeString);
  const synonyms = (product.synonyms || []).map(normalizeString);

  let score = 0;

  // Exact name match (Highest priority)
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 80;
  else if (name.includes(q)) score += 50;

  // Category match
  if (category === q) score += 40;
  else if (category.includes(q)) score += 20;

  // Tag/Keyword/Synonym matches
  if (tags.some(t => t === q)) score += 35;
  if (keywords.some(k => k === q)) score += 35;
  if (synonyms.some(s => s === q)) score += 30;

  if (tags.some(t => t.includes(q))) score += 15;
  if (keywords.some(k => k.includes(q))) score += 15;
  if (synonyms.some(s => s.includes(q))) score += 10;

  // Description match
  if (desc.includes(q)) score += 5;

  // Semantic Expansion matching
  const expandedTerms = SEMANTIC_MAPPING[q] || [];
  for (const term of expandedTerms) {
    if (name.includes(term)) score += 60;
    if (category.includes(term)) score += 30;
    if (tags.some(t => t.includes(term))) score += 25;
  }

  // Reverse Semantic Check: If the name/category/tags of a product match a key in SEMANTIC_MAPPING that equals the query
  // Example: query is "soft drink", product is "Mirinda" (which has "soft drink" in its synonyms)
  // This is already covered by synonym check above, but we can add more robust checks here if needed.

  return score;
};

/**
 * Filter and sort products based on search query
 */
export const searchProducts = (products: Product[], query: string): Product[] => {
  if (!query.trim()) return [];

  return products
    .map(p => ({ product: p, score: scoreProduct(p, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.product);
};

/**
 * Get popular categories based on query
 */
export const getMatchingCategories = (products: Product[], query: string): string[] => {
  const matchedProducts = searchProducts(products, query);
  const categories = Array.from(new Set(matchedProducts.map(p => p.category)));
  return categories.slice(0, 5);
};
