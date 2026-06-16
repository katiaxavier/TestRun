import { PrismaService } from '../prisma/prisma.service';
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private formatDate;
    generateXlsx(executionId: string): Promise<Buffer>;
    getBatchReport(batchId: string): Promise<{
        batch: {
            id: string;
            name: string | null;
            testedFeature: string | null;
            status: string;
            suiteIds: import("@prisma/client/runtime/library").JsonValue;
        };
        summary: {
            totalTests: number;
            passed: number;
            failed: number;
            blocked: number;
            inProgress: number;
            pending: number;
        };
        executions: {
            id: string;
            suite: {
                id: string;
                jiraKey: string;
                title: string;
                createdAt: Date;
                updatedAt: Date;
            } | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            testedFeature: string | null;
            responsible: string;
            status: string;
            testCases: ({
                testCase: {
                    link: string | null;
                    id: string;
                    jiraKey: string;
                    title: string;
                    createdAt: Date;
                    updatedAt: Date;
                    priority: string | null;
                    suiteId: string;
                };
                issues: {
                    id: string;
                    jiraKey: string | null;
                    title: string;
                    createdAt: Date;
                    updatedAt: Date;
                    responsible: string | null;
                    status: string | null;
                    type: string;
                    severity: string | null;
                    executionTestCaseId: string;
                }[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                responsible: string | null;
                status: string;
                comments: string | null;
                executionId: string;
                testCaseId: string;
            })[];
        }[];
    }>;
    generateBatchXlsx(batchId: string): Promise<Buffer>;
    generateBatchPdf(batchId: string): Promise<Buffer>;
    generatePdf(executionId: string): Promise<Buffer>;
}
