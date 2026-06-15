import { ExecutionsService, CreateExecutionDto, UpdateTestCaseDto, CreateIssueDto, CreateBatchExecutionDto } from './executions.service';
export declare class ExecutionsController {
    private readonly executionsService;
    constructor(executionsService: ExecutionsService);
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
            suiteId: string | null;
            batchId: string | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            testedFeature: string | null;
            responsible: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        })[];
        id: string;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
        responsible: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    findOne(id: string): Promise<{
        suite: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            jiraKey: string;
            title: string;
        } | null;
        testCases: ({
            testCase: {
                id: string;
                suiteId: string;
                createdAt: Date;
                updatedAt: Date;
                link: string | null;
                jiraKey: string;
                title: string;
                priority: string | null;
            };
            issues: {
                id: string;
                responsible: string | null;
                status: string | null;
                createdAt: Date;
                updatedAt: Date;
                jiraKey: string | null;
                title: string;
                executionTestCaseId: string;
                type: string;
                severity: string | null;
            }[];
        } & {
            id: string;
            responsible: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            executionId: string;
            testCaseId: string;
            comments: string | null;
        })[];
    } & {
        id: string;
        suiteId: string | null;
        batchId: string | null;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
        responsible: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(dto: CreateExecutionDto): Promise<{
        suite: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            jiraKey: string;
            title: string;
        } | null;
        testCases: ({
            testCase: {
                id: string;
                suiteId: string;
                createdAt: Date;
                updatedAt: Date;
                link: string | null;
                jiraKey: string;
                title: string;
                priority: string | null;
            };
            issues: {
                id: string;
                responsible: string | null;
                status: string | null;
                createdAt: Date;
                updatedAt: Date;
                jiraKey: string | null;
                title: string;
                executionTestCaseId: string;
                type: string;
                severity: string | null;
            }[];
        } & {
            id: string;
            responsible: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            executionId: string;
            testCaseId: string;
            comments: string | null;
        })[];
    } & {
        id: string;
        suiteId: string | null;
        batchId: string | null;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
        responsible: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createBatch(dto: CreateBatchExecutionDto): Promise<({
        executions: ({
            suite: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                jiraKey: string;
                title: string;
            } | null;
            testCases: ({
                testCase: {
                    id: string;
                    suiteId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    link: string | null;
                    jiraKey: string;
                    title: string;
                    priority: string | null;
                };
                issues: {
                    id: string;
                    responsible: string | null;
                    status: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    jiraKey: string | null;
                    title: string;
                    executionTestCaseId: string;
                    type: string;
                    severity: string | null;
                }[];
            } & {
                id: string;
                responsible: string | null;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                executionId: string;
                testCaseId: string;
                comments: string | null;
            })[];
        } & {
            id: string;
            suiteId: string | null;
            batchId: string | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            testedFeature: string | null;
            responsible: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        })[];
    } & {
        id: string;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
        responsible: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
    }) | null>;
    findBatch(id: string): Promise<{
        executions: ({
            suite: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                jiraKey: string;
                title: string;
            } | null;
            testCases: ({
                testCase: {
                    id: string;
                    suiteId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    link: string | null;
                    jiraKey: string;
                    title: string;
                    priority: string | null;
                };
                issues: {
                    id: string;
                    responsible: string | null;
                    status: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    jiraKey: string | null;
                    title: string;
                    executionTestCaseId: string;
                    type: string;
                    severity: string | null;
                }[];
            } & {
                id: string;
                responsible: string | null;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                executionId: string;
                testCaseId: string;
                comments: string | null;
            })[];
        } & {
            id: string;
            suiteId: string | null;
            batchId: string | null;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            testedFeature: string | null;
            responsible: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        })[];
    } & {
        id: string;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
        responsible: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
    }>;
    deleteBatch(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    delete(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateStatus(id: string, status: string): Promise<{
        id: string;
        suiteId: string | null;
        batchId: string | null;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
        responsible: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateTestCase(id: string, dto: UpdateTestCaseDto): Promise<{
        testCase: {
            id: string;
            suiteId: string;
            createdAt: Date;
            updatedAt: Date;
            link: string | null;
            jiraKey: string;
            title: string;
            priority: string | null;
        };
        issues: {
            id: string;
            responsible: string | null;
            status: string | null;
            createdAt: Date;
            updatedAt: Date;
            jiraKey: string | null;
            title: string;
            executionTestCaseId: string;
            type: string;
            severity: string | null;
        }[];
    } & {
        id: string;
        responsible: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        executionId: string;
        testCaseId: string;
        comments: string | null;
    }>;
    addIssue(id: string, dto: CreateIssueDto): Promise<{
        id: string;
        responsible: string | null;
        status: string | null;
        createdAt: Date;
        updatedAt: Date;
        jiraKey: string | null;
        title: string;
        executionTestCaseId: string;
        type: string;
        severity: string | null;
    }>;
    removeIssue(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
