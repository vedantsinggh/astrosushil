export class StorageService {
  /**
   * Generates a download URL for a rendered PDF report.
   */
  public async getPresignedDownloadUrl(reportId: string): Promise<string> {
    const baseUrl = process.env.PUBLIC_API_URL || 'http://localhost:3000';
    return `${baseUrl}/api/v1/reports/${reportId}/download-file`;
  }
}

export const storageService = new StorageService();
