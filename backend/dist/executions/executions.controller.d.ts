import { ExecutionsService, CreateExecutionDto, UpdateTestCaseDto, CreateIssueDto } from './executions.service';
export declare class ExecutionsController {
    private readonly executionsService;
    constructor(executionsService: ExecutionsService);
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
    removeTestCase(executionId: string, etcId: string): Promise<{
        success: boolean;
    }>;
    removeIssue(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
