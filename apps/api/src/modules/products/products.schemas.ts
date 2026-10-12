export interface ListProductsQuery {
  category?: string;
  productType?: string;
  search?: string;
  limit?: number;
  offset?: number;
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
      phoneNumber: { type: 'string', minLength: 10 },
      addressLine1: { type: 'string', minLength: 5 },
      addressLine2: { type: 'string' },
      city: { type: 'string', minLength: 2 },
      state: { type: 'string', minLength: 2 },
      postalCode: { type: 'string', minLength: 5, maxLength: 10 },
      country: { type: 'string', default: 'India' },
      isDefault: { type: 'boolean', default: false },
    },
  },
};
