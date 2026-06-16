import { SuitesService } from './suites.service';
export declare class SuitesController {
    private readonly suitesService;
    constructor(suitesService: SuitesService);
    findAll(): Promise<({
        _count: {
            testCases: number;
            executions: number;
        };
    } & {
        id: string;
        jiraKey: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findOne(id: string): Promise<{
        testCases: {
            id: string;
            jiraKey: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
            link: string | null;
            priority: string | null;
            suiteId: string;
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
        _count: {
            testCases: number;
            executions: number;
        };
    } & {
        id: string;
        jiraKey: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    importSuite(jiraKey: string): Promise<{
        testCases: {
            id: string;
            jiraKey: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
            link: string | null;
            priority: string | null;
            suiteId: string;
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
        _count: {
            testCases: number;
            executions: number;
        };
    } & {
        id: string;
        jiraKey: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteSuite(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteTestCase(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
