import { ExecutionsService, CreateExecutionDto, UpdateTestCaseDto, CreateIssueDto, CreateBatchExecutionDto } from './executions.service';
export declare class ExecutionsController {
    private readonly executionsService;
    constructor(executionsService: ExecutionsService);
    findAllBatches(): Promise<({
        executions: ({
            suite: {
                id: string;
                jiraKey: string;
                title: string;
                createdAt: Date;
                updatedAt: Date;
            } | null;
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
        responsible: string;
        status: string;
        suiteIds: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
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
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
        responsible: string;
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
        sprint: string;
        version: string;
        startDate: Date;
        endDate: Date;
        testedFeature: string | null;
        responsible: string;
        status: string;
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
    updateTestCase(id: string, dto: UpdateTestCaseDto): Promise<{
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
    addIssue(id: string, dto: CreateIssueDto): Promise<{
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
    removeIssue(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
