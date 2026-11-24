import { commerceService, CreateOrderParams, VerifyPaymentParams, RequestRefundParams } from '../commerce/commerce.service';
import { CreateOrderInput, VerifyPaymentInput, RefundOrderInput } from './payments.schemas';

export class PaymentsService {
  public async createOrder(input: CreateOrderInput, user: { id: string }) {
    // `discountPaise` is a server-side hook for the coupon module and is never read from the request.
    return commerceService.createOrder({ ...(input as CreateOrderParams), discountPaise: undefined }, user);
  }

  public async verifyPayment(input: VerifyPaymentInput, user: { id: string; role?: string }) {
    return commerceService.verifyPayment(input as VerifyPaymentParams, user);
  }

  public async getOrderById(orderId: string, user: { id: string; role?: string }) {
    return commerceService.getOrderById(orderId, user);
  }

  public async getUserOrders(user: { id: string }) {
    return commerceService.getUserOrders(user);
  }

  /**
   * Staff refund (owner decision 2026-11-24: refunds are staff-only). Call only from a route that
   * has passed `checkPermission('payments:refund')`.
   */
  public async refundAsStaff(input: RefundOrderInput & { orderId: string }, staff: { id: string; role?: string; email?: string | null }) {
    return commerceService.requestRefund(input as RequestRefundParams, staff, { staffAuthorised: true });
  }
}

export const paymentsService = new PaymentsService();
