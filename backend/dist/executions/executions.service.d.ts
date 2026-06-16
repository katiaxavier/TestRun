import { PrismaService } from '../prisma/prisma.service';
export declare class CreateExecutionDto {
    suiteId: string;
    sprint: string;
    version?: string;
    startDate: string;
    endDate: string;
    responsible: string;
}
export declare class CreateBatchExecutionDto {
    suiteIds: string[];
    name?: string;
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
        } | null;
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        suiteId: string | null;
        batchId: string | null;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
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
        } | null;
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        suiteId: string | null;
        batchId: string | null;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
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
        suiteId: string | null;
        batchId: string | null;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
        responsible: string;
        status: string;
    }>;
    createBatch(dto: CreateBatchExecutionDto): Promise<({
        executions: ({
            suite: {
                id: string;
                jiraKey: string;
                title: string;
                createdAt: Date;
                updatedAt: Date;
            } | null;
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
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            suiteId: string | null;
            batchId: string | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            testedFeature: string | null;
            responsible: string;
            status: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        testedFeature: string | null;
        status: string;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
    }) | null>;
    findBatch(id: string): Promise<{
        executions: ({
            suite: {
                id: string;
                jiraKey: string;
                title: string;
                createdAt: Date;
                updatedAt: Date;
            } | null;
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
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            suiteId: string | null;
            batchId: string | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            testedFeature: string | null;
            responsible: string;
            status: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        testedFeature: string | null;
        status: string;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
    }>;
    findAllBatches(): Promise<{
        suites: {
            id: string;
            jiraKey: string;
            title: string;
        }[];
        executions: ({
            _count: {
                testCases: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            suiteId: string | null;
            batchId: string | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            testedFeature: string | null;
            responsible: string;
            status: string;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        testedFeature: string | null;
        status: string;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    deleteBatch(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
