import { PrismaService } from '../prisma/prisma.service';
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private formatDate;
    generateXlsx(executionId: string): Promise<Buffer>;
    generatePdf(executionId: string): Promise<Buffer>;
}
