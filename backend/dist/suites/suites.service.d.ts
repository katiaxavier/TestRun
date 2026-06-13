import { PrismaService } from '../prisma/prisma.service';
import { JiraService } from '../jira/jira.service';
export declare class SuitesService {
    private readonly prisma;
    private readonly jiraService;
    constructor(prisma: PrismaService, jiraService: JiraService);
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
    } & {
        id: string;
        jiraKey: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    importFromJira(jiraKey: string): Promise<{
        testCases: {
            link: string | null;
            id: string;
            jiraKey: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
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
