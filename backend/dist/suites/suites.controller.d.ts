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
            link: string | null;
            id: string;
            jiraKey: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
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
            suiteId: string;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            testedFeature: string;
            responsible: string;
            status: string;
        })[];
    } & {
        id: string;
        jiraKey: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    importSuite(jiraKey: string): Promise<{
        testCases: {
            link: string | null;
            id: string;
            jiraKey: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
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
            suiteId: string;
            sprint: string;
            version: string;
            startDate: Date;
            endDate: Date;
            testedFeature: string;
            responsible: string;
            status: string;
        })[];
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
