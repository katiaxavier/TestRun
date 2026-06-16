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
        excludedTestCaseIds: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    create(dto: CreateBatchExecutionDto): Promise<{
        executions: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        testedFeature: string | null;
        status: string;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
        excludedTestCaseIds: import("@prisma/client/runtime/library").JsonValue;
    }>;
    findOne(id: string): Promise<{
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
        excludedTestCaseIds: import("@prisma/client/runtime/library").JsonValue;
    }>;
    removeTestCase(id: string, tcId: string): Promise<{
        success: boolean;
    }>;
    createExecution(id: string, dto: CreateBatchExecutionItemDto): Promise<{
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
        excludedTestCaseIds: import("@prisma/client/runtime/library").JsonValue;
    }>;
    delete(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
