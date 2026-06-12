import { PrismaService } from '../prisma/prisma.service';
export declare class CreateExecutionDto {
    suiteId: string;
    sprint: string;
    version: string;
    startDate: string;
    endDate: string;
    testedFeature: string;
    responsible: string;
}
export declare class UpdateTestCaseDto {
    status?: string;
    responsible?: string;
    comments?: string;
}
export declare class CreateIssueDto {
    type: string;
    jiraKey?: string;
    title: string;
    severity?: string;
    status?: string;
    responsible?: string;
}
export declare class ExecutionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findOne(id: string): Promise<{
        suite: {
            id: string;
            jiraKey: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
        };
        testCases: ({
            testCase: {
                link: string | null;
                id: string;
                jiraKey: string;
                title: string;
                createdAt: Date;
                updatedAt: Date;
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        suiteId: string;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string;
        responsible: string;
        status: string;
    }>;
    create(dto: CreateExecutionDto): Promise<{
        suite: {
            id: string;
            jiraKey: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
        };
        testCases: ({
            testCase: {
                link: string | null;
                id: string;
                jiraKey: string;
                title: string;
                createdAt: Date;
                updatedAt: Date;
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        suiteId: string;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string;
        responsible: string;
        status: string;
    }>;
    updateTestCase(execTestCaseId: string, dto: UpdateTestCaseDto): Promise<{
        testCase: {
            link: string | null;
            id: string;
            jiraKey: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
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
    }>;
    addIssue(execTestCaseId: string, dto: CreateIssueDto): Promise<{
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
    }>;
    removeIssue(issueId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    delete(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateStatus(id: string, status: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        suiteId: string;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string;
        responsible: string;
        status: string;
    }>;
}
