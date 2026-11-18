import { apiRequest } from './apiClient';

export interface AtelierVariantDTO {
  id: string;
  sku: string;
  name: string;
  sizeLabel: string | null;
  volumeMl?: string | null;
  priceMinor: string;
  compareAtPriceMinor?: string | null;
  currency: string;
  availableStock: number;
  inStock: boolean;
}

export interface AtelierProductDTO {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string;
  benefits: string[];
  howToUse?: string | null;
  warnings?: string | null;
  ritualStep: 'CLEANSE' | 'TREAT' | 'HYDRATE' | 'PROTECT';
  featured: boolean;
  brand: { id: string; slug: string; name: string; country?: string | null };
  category: { id: string; slug: string; name: string };
  images: Array<{ id: string; objectKey: string; altText: string | null; isPrimary: boolean }>;
  variants: AtelierVariantDTO[];
  ingredients?: Array<{ isKeyActive: boolean; ingredient: { id: string; name: string; inciName: string | null } }>;
  concerns?: Array<{ concern: { id: string; slug: string; name: string } }>;
  skinTypes?: Array<{ skinType: string }>;
}

export interface AtelierBagItemDTO {
  id: string;
  variantId: string;
  quantity: number;
  unitPriceMinor: string;
  lineTotalMinor: string;
  currency: string;
  availableStock: number;
  inStock: boolean;
  variant: {
    id: string;
    sku: string;
    name: string;
    sizeLabel: string | null;
    product: {
      id: string;
      slug: string;
      name: string;
      brandName: string;
      imageKey: string | null;
    };
  };
}

export interface AtelierBagDTO {
  id: string;
  currency: string;
  subtotalMinor: string;
  itemCount: number;
  items: AtelierBagItemDTO[];
}

export interface AtelierConcernDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface AtelierRecommendationDTO {
  productId: string;
  slug: string;
  name: string;
  brandName: string;
  ritualStep: string;
  minPriceMinor: string;
  currency: string;
  score: number;
  reasons: string[];
}

export interface AtelierAddressDTO {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  isDefault: boolean;
}

export interface AtelierOrderDTO {
  id: string;
  orderNumber: string;
  currency: string;
  subtotalMinor: string;
  shippingMinor: string;
  totalMinor: string;
  orderStatus: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  placedAt: string;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    variantNameSnapshot: string;
    quantity: number;
    lineTotalMinor: string;
  }>;
}

export const atelierService = {
  async getProducts(params?: { q?: string; category?: string; skinType?: string; concern?: string }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.category && params.category !== 'ALL') qs.set('category', params.category);
    if (params?.skinType) qs.set('skinType', params.skinType);
    if (params?.concern) qs.set('concern', params.concern);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest<{ success: boolean; products: AtelierProductDTO[] }>(`/api/atelier/products${suffix}`);
  },

  async getProductBySlug(slug: string) {
    return apiRequest<{ success: boolean; product: AtelierProductDTO }>(`/api/atelier/products/${encodeURIComponent(slug)}`);
  },

  async getConcerns() {
    return apiRequest<{ success: boolean; concerns: AtelierConcernDTO[] }>('/api/atelier/concerns');
  },

  async getBag() {
    return apiRequest<{ success: boolean; bag: AtelierBagDTO }>('/api/atelier/bag');
  },

  async addToBag(variantId: string, quantity = 1) {
    return apiRequest<{ success: boolean }>('/api/atelier/bag/items', {
      method: 'POST',
      body: JSON.stringify({ variantId, quantity }),
    });
  },

  async updateBagItem(itemId: string, quantity: number) {
    return apiRequest<{ success: boolean }>(`/api/atelier/bag/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },

  async removeBagItem(itemId: string) {
    return apiRequest<{ success: boolean }>(`/api/atelier/bag/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  async getSkinProfile() {
    return apiRequest<{
      success: boolean;
      hasConsent: boolean;
      profile: {
        skinType: string;
        sensitivityLevel: string | null;
        routinePreference: string | null;
        concerns: Array<{ concernId: string; concern: AtelierConcernDTO }>;
      } | null;
    }>('/api/atelier/skin-profile');
  },

  async grantSkinConsent() {
    return apiRequest<{ success: boolean }>('/api/atelier/skin-consent', {
      method: 'POST',
      body: JSON.stringify({ version: '1.0-ATELIER' }),
    });
  },

  async saveSkinProfile(payload: {
    skinType: string;
    sensitivityLevel?: string;
    routinePreference?: string;
    concernIds: string[];
  }) {
    return apiRequest<{ success: boolean }>('/api/atelier/skin-profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getRecommendations() {
    return apiRequest<{ success: boolean; hasProfile: boolean; recommendations: AtelierRecommendationDTO[] }>(
      '/api/atelier/recommendations'
    );
  },

  async getRoutines() {
    return apiRequest<{
      success: boolean;
      routines: Array<{
        id: string;
        name: string;
        steps: Array<{
          id: string;
          timeOfDay: 'AM' | 'PM';
          stepNumber: number;
          stepTitle: string;
          guidance: string | null;
        }>;
      }>;
    }>('/api/atelier/routines');
  },

  async createDefaultRoutine() {
    return apiRequest<{ success: boolean }>('/api/atelier/routines', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Daily Ritual' }),
    });
  },

  async getAddresses() {
    return apiRequest<{ success: boolean; addresses: AtelierAddressDTO[] }>('/api/atelier/addresses');
  },

  async createAddress(payload: {
    recipientName: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
    isDefault?: boolean;
  }) {
    return apiRequest<{ success: boolean; address: AtelierAddressDTO }>('/api/atelier/addresses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getShippingQuote(state: string) {
    return apiRequest<{
      success: boolean;
      quote: { zoneName: string; amountMinor: string; currency: string; estimatedDays: string | null };
    }>('/api/atelier/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({ state }),
    });
  },

  async checkout(addressId: string) {
    return apiRequest<{ success: boolean; order: AtelierOrderDTO }>('/api/atelier/checkout', {
      method: 'POST',
      body: JSON.stringify({ addressId }),
    });
  },

  async initializePayment(orderId: string) {
    return apiRequest<{
      success: boolean;
      reference: string;
      authorizationUrl?: string;
      mode?: string;
    }>('/api/atelier/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  },

  async getOrders() {
    return apiRequest<{ success: boolean; orders: AtelierOrderDTO[] }>('/api/atelier/orders');
  },
};
