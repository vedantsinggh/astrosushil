export interface ListProductsQuery {
  category?: string;
  productType?: string;
  search?: string;
  limit?: number;
  offset?: number;
  /** Website filters: product type, page number (alternative to offset), featured only. */
  type?: string;
  page?: number;
  featured?: boolean | string;
}

export interface CartItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CalculateCartInput {
  items: CartItemInput[];
  shippingAddressId?: string;
}

export interface CreateShopOrderInput {
  items: CartItemInput[];
  shippingAddressId?: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface VerifyShopPaymentInput {
  orderId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface ShippingAddressInput {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
  /** Website address fields. */
  landmark?: string;
  type?: string; // home | work | other
}

export interface AdminUpdateFulfillmentInput {
  fulfillmentStatus: 'UNFULFILLED' | 'PROCESSING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  trackingNumber?: string;
  courierPartner?: string;
}

export interface AdminUpdateStockInput {
  stock: number;
  isAvailable: boolean;
}

export interface AdminGrantEntitlementInput {
  userId: string;
  productId: string;
}

export interface AdminRevokeEntitlementInput {
  reason?: string;
}

export const listProductsSchema = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      productType: { type: 'string' },
      search: { type: 'string' },
      limit: { type: 'integer', default: 20 },
      offset: { type: 'integer', default: 0 },
      type: { type: 'string', enum: ['physical', 'digital', 'service'] },
      page: { type: 'integer', minimum: 1 },
      featured: { type: 'boolean' },
    },
  },
};

export const calculateCartSchema = {
  body: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string' },
            variantId: { type: 'string' },
            quantity: { type: 'integer', minimum: 1, maximum: 50 },
          },
        },
      },
      shippingAddressId: { type: 'string' },
    },
  },
};

export const createShopOrderSchema = {
  body: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string' },
            variantId: { type: 'string' },
            quantity: { type: 'integer', minimum: 1, maximum: 50 },
          },
        },
      },
      shippingAddressId: { type: 'string' },
      idempotencyKey: { type: 'string' },
      notes: { type: 'string' },
    },
  },
};

export const verifyShopPaymentSchema = {
  body: {
    type: 'object',
    required: ['razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'],
    properties: {
      orderId: { type: 'string' },
      razorpayOrderId: { type: 'string' },
      razorpayPaymentId: { type: 'string' },
      razorpaySignature: { type: 'string' },
    },
  },
};

export const shippingAddressSchema = {
  body: {
    type: 'object',
    required: ['fullName', 'phoneNumber', 'addressLine1', 'city', 'state', 'postalCode'],
    properties: {
      fullName: { type: 'string', minLength: 2 },
      phoneNumber: { type: 'string', minLength: 7, maxLength: 20 },
      addressLine1: { type: 'string', minLength: 5 },
      addressLine2: { type: 'string' },
      city: { type: 'string', minLength: 2 },
      state: { type: 'string', minLength: 2 },
      postalCode: { type: 'string', minLength: 4, maxLength: 12 },
      country: { type: 'string', default: 'India' },
      isDefault: { type: 'boolean', default: false },
      landmark: { type: 'string', maxLength: 200 },
      type: { type: 'string', enum: ['home', 'work', 'other', 'HOME', 'WORK', 'OTHER'] },
    },
  },
};

/** Update: any subset of the address fields. The service writes only these fields, whatever else is sent. */
export const updateShippingAddressSchema = {
  body: {
    type: 'object',
    properties: {
      fullName: { type: 'string', minLength: 2 },
      phoneNumber: { type: 'string', minLength: 7, maxLength: 20 },
      addressLine1: { type: 'string', minLength: 5 },
      addressLine2: { type: 'string' },
      city: { type: 'string', minLength: 2 },
      state: { type: 'string', minLength: 2 },
      postalCode: { type: 'string', minLength: 4, maxLength: 12 },
      country: { type: 'string' },
      isDefault: { type: 'boolean' },
      landmark: { type: 'string', maxLength: 200 },
      type: { type: 'string', enum: ['home', 'work', 'other', 'HOME', 'WORK', 'OTHER'] },
    },
  },
};
