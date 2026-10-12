import { commerceService, CreateOrderParams, VerifyPaymentParams, RequestRefundParams } from '../commerce/commerce.service';
import { CreateOrderInput, VerifyPaymentInput, RefundOrderInput } from './payments.schemas';

export class PaymentsService {
  public async createOrder(input: CreateOrderInput, user: { id: string }) {
    return commerceService.createOrder(input as CreateOrderParams, user);
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

  public async requestRefund(input: RefundOrderInput & { orderId: string }, user: { id: string; role?: string }) {
    return commerceService.requestRefund(input as RequestRefundParams, user);
  }
}

export const paymentsService = new PaymentsService();
