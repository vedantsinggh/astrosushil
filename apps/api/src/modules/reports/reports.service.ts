import { prisma } from '../../services/prisma.service';
import { storageService } from '../../services/storage.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { CreateReportInput } from './reports.schemas';

export class ReportsService {
  public async createReportJob(
    input: CreateReportInput,
    user: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    // 1. Verify birth profile ownership
    const profile = await prisma.birthProfile.findUnique({
      where: { id: input.birthProfileId },
    });

    if (!profile || (profile.userId !== user.id && user.role !== 'ADMIN')) {
      throw new NotFoundError('Birth profile not found');
    }

    // 2. If orderId is provided, verify order is paid
    if (input.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order || order.userId !== user.id) {
        throw new NotFoundError('Order not found');
      }

      if (order.status !== 'PAID' && user.role !== 'ADMIN') {
        throw new ValidationError('Payment required before generating report');
      }
    }

    // 3. Create Report database record
    const report = await prisma.report.create({
      data: {
        userId: user.id,
        birthProfileId: input.birthProfileId,
        orderId: input.orderId || null,
        reportType: input.reportType,
        status: 'PROCESSING',
      },
    });

    // 4. Generate download URL placeholder (simulating worker completion)
    const downloadUrl = await storageService.getPresignedDownloadUrl(report.id);

    // Update status to COMPLETED for synchronous demo / dev testing
    const updatedReport = await prisma.report.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        s3Url: downloadUrl,
      },
    });

    return updatedReport;
  }

  public async getReportStatus(
    reportId: string,
    user: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { birthProfile: true },
    });

    if (!report || (report.userId !== user.id && user.role !== 'ADMIN')) {
      throw new NotFoundError('Report not found');
    }

    return report;
  }

  public async getUserReports(user: { id: string }) {
    return prisma.report.findMany({
      where: { userId: user.id },
      include: { birthProfile: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const reportsService = new ReportsService();
