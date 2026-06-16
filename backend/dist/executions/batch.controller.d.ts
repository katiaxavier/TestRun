import { ExecutionsService, CreateBatchExecutionDto, CreateBatchExecutionItemDto } from './executions.service';
export declare class BatchController {
    private readonly executionsService;
    constructor(executionsService: ExecutionsService);
    findAll(): Promise<{
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
            testedFeature: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            suiteId: string | null;
            batchId: string | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            responsible: string;
        })[];
        id: string;
        name: string | null;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
        testedFeature: string | null;
        status: string;
        excludedTestCaseIds: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(dto: CreateBatchExecutionDto): Promise<{
        executions: {
            id: string;
            testedFeature: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            suiteId: string | null;
            batchId: string | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            responsible: string;
        }[];
    } & {
        id: string;
        name: string | null;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
        testedFeature: string | null;
        status: string;
        excludedTestCaseIds: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findOne(id: string): Promise<{
        executions: ({
            testCases: ({
                testCase: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    jiraKey: string;
                    title: string;
                    suiteId: string;
                    link: string | null;
                    priority: string | null;
                };
                issues: {
                    id: string;
                    status: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    jiraKey: string | null;
                    title: string;
                    responsible: string | null;
                    executionTestCaseId: string;
                    type: string;
                    severity: string | null;
                }[];
            } & {
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                responsible: string | null;
                executionId: string;
                testCaseId: string;
                comments: string | null;
            })[];
            suite: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                jiraKey: string;
                title: string;
            } | null;
        } & {
            id: string;
            testedFeature: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            suiteId: string | null;
            batchId: string | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            responsible: string;
        })[];
    } & {
        id: string;
        name: string | null;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
        testedFeature: string | null;
        status: string;
        excludedTestCaseIds: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeTestCase(id: string, tcId: string): Promise<{
        success: boolean;
    }>;
    createExecution(id: string, dto: CreateBatchExecutionItemDto): Promise<{
        executions: ({
            testCases: ({
                testCase: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    jiraKey: string;
                    title: string;
                    suiteId: string;
                    link: string | null;
                    priority: string | null;
                };
                issues: {
                    id: string;
                    status: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    jiraKey: string | null;
                    title: string;
                    responsible: string | null;
                    executionTestCaseId: string;
                    type: string;
                    severity: string | null;
                }[];
            } & {
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                responsible: string | null;
                executionId: string;
                testCaseId: string;
                comments: string | null;
            })[];
            suite: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                jiraKey: string;
                title: string;
            } | null;
        } & {
            id: string;
            testedFeature: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            suiteId: string | null;
            batchId: string | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            responsible: string;
        })[];
    } & {
        id: string;
        name: string | null;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
        testedFeature: string | null;
        status: string;
        excludedTestCaseIds: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
